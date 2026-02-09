import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
    getUnprocessedSeeds,
    batchCreateCaseFiles,
    batchUpdateSeedsStatus,
    batchCreateEvidence,
    checkDuplicate,
} from '@/lib/airtable';
import { CachedBrregLookup } from '@/lib/bronnysund';
import { batchProcessSeeds, generateWhyNowBatch } from '@/lib/gemini';
import { searchCorroboration } from '@/lib/search';
import { scrapeUrl } from '@/lib/firecrawl';
import { getScoringWeights } from '@/config/scoring-config';
import { logger } from '@/lib/logger';

// ============================================
// CONFIGURATION
// ============================================
export const maxDuration = 300; // 5 minutes max

// ============================================
// ESL+ THRESHOLDS (per Addendum v1.0)
// ============================================
const THRESHOLDS = {
    C_MIN: 0.50,          // Minimum C for qualification (lowered to increase volume)
    MAX_ITERATIONS: 5,
};

// ============================================
// SCORING HELPERS (per Addendum v1.0)
// ============================================
function computeC(E: number, W: number, V: number, R: number): number {
    return (E + W + V + (1 - R)) / 4;
}

function computeStars(C: number): number {
    if (C >= 0.70) return 3;
    if (C >= 0.60) return 2;
    if (C >= 0.50) return 1;
    return 0;
}

// ============================================
// MAIN ENDPOINT - BATCH PROCESSING
// ============================================
export async function POST(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    const startTime = Date.now();
    const apiCallsUsed = { gemini: 0, bronnysund: 0, airtable: 0 };

    // Mode: production (max 10, stars only) or test (max 25, full scores)
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') === 'production' ? 'production' : 'test') as 'production' | 'test';
    const maxLeads = mode === 'production' ? 10 : 25;

    // Load current dynamic weights
    const SCORING_WEIGHTS = getScoringWeights();

    try {
        // 1. Hent alle ubehandlede seeds i ETT kall
        const unprocessedSeeds = await getUnprocessedSeeds();
        apiCallsUsed.airtable++;

        if (unprocessedSeeds.length === 0) {
            return NextResponse.json({
                message: 'No seeds to process',
                mode,
                apiCalls: apiCallsUsed
            });
        }

        logger.info(`📥 Processing ${unprocessedSeeds.length} seeds in batch mode`, { mode, component: 'process-esl' });

        // 2. Brønnøysund: Batch lookup med caching
        const orgNumbers = [...new Set(unprocessedSeeds.map(s => s.org_number).filter((n): n is string => !!n))];
        const brregCache = new CachedBrregLookup();
        const brregData = await brregCache.batchLookup(orgNumbers);
        apiCallsUsed.bronnysund += brregCache.getApiCallCount();

        // 3. Initial scoring & Verification
        const caseFilesData = await Promise.all(unprocessedSeeds.map(async (seed) => {
            const sourceType = seed.source_type || 'default';
            const scores = SCORING_WEIGHTS[sourceType] || SCORING_WEIGHTS.default;

            // Try org number lookup first, fall back to name search
            let company = seed.org_number ? (brregData.get(seed.org_number.replace(/\s/g, '')) || null) : null;
            if (!company && seed.company_name) {
                company = await brregCache.searchByName(seed.company_name);
                if (company && mode === 'test') {
                    logger.audit(`Name search match: "${seed.company_name}" → ${company.navn} (${company.organisasjonsnummer})`, { mode, component: 'process-esl' });
                }
            }

            const verification = CachedBrregLookup.verify(company);

            if (mode === 'test') {
                logger.audit(`Verification for ${seed.company_name}: ${JSON.stringify(verification)}`, { mode, component: 'process-esl' });
            }

            // Use resolved org number (from seed or name search)
            const resolvedOrgNumber = seed.org_number || company?.organisasjonsnummer || '';

            // Anti-repetition: Addendum §4 — dedup key is (company, trigger, role)
            const trigger = seed.trigger_detected || 'LeadershipChange';
            const role = mapTriggerToRole(trigger);
            const isDuplicate = resolvedOrgNumber
                ? await checkDuplicate(resolvedOrgNumber, trigger, role)
                : false;

            if (isDuplicate && mode === 'test') {
                logger.audit(`Duplicate detected: ${seed.company_name} (${trigger}, ${role})`, { mode, component: 'process-esl' });
            }

            return {
                seed: { ...seed },
                company_name: seed.company_name || company?.navn || 'Unknown',
                org_number: resolvedOrgNumber,
                E: scores.E0,
                W: scores.W0,
                V: verification.V,
                R: scores.R0,
                brreg_data: company,
                verification,
                is_duplicate: isDuplicate,
                status: 'processing' as const,
            };
        }));

        // 4. BATCH Gemini scoring (Stage 1)
        // Filter out hard stops (veto: entity not found OR not Østlandet) and duplicates
        const toScore = caseFilesData.filter(c => !c.verification.hard_stop && !c.is_duplicate);

        if (toScore.length === 0) {
            const seedIds = unprocessedSeeds.map(s => s.id);
            await batchUpdateSeedsStatus(seedIds, true);
            apiCallsUsed.airtable++;

            return NextResponse.json({
                message: 'All seeds were filtered by vetoes or deduplication',
                mode,
                processed: unprocessedSeeds.length,
                skipped: unprocessedSeeds.length,
                apiCalls: apiCallsUsed
            });
        }

        // Addendum §5: No free-form Gemini learning from feedback
        let scoredCases = await batchProcessSeeds(toScore as any);
        apiCallsUsed.gemini++;

        // 5. STAGE 2: Targeted Seeking for leads just below C threshold
        const needsEvidence = scoredCases.filter(c => {
            const C = computeC(c.E, c.W, c.V, c.R);
            return C < THRESHOLDS.C_MIN && C >= 0.50;
        });

        if (needsEvidence.length > 0) {
            logger.info(`🔍 Stage 2: Seeking evidence for ${needsEvidence.length} promising leads`, { mode, component: 'process-esl' });

            for (const c of needsEvidence) {
                const searchResults = await searchCorroboration(c.company_name, c.seed.trigger_type || c.seed.trigger_detected || '');
                if (searchResults.length > 0) {
                    c.seed.raw_content = (c.seed.raw_content || '') + '\n\nSUPPLEMENTAL EVIDENCE:\n' +
                        searchResults.map(sr => `[${sr.title}]: ${sr.content || sr.description}`).join('\n---\n');
                }
            }

            const reScored = await batchProcessSeeds(needsEvidence);
            apiCallsUsed.gemini++;

            scoredCases = scoredCases.map(c => {
                const updated = reScored.find(rs => rs.org_number === c.org_number);
                return updated || c;
            });
        }

        // 6. Qualification: C ≥ 0.60 (Addendum §3)
        const qualified = scoredCases.filter(c => {
            const C = computeC(c.E, c.W, c.V, c.R);
            return C >= THRESHOLDS.C_MIN;
        });

        const dropped = scoredCases.filter(c => !qualified.includes(c));

        // Apply output cap: sort by C descending, take max leads
        const sortedQualified = qualified.sort((a, b) =>
            computeC(b.E, b.W, b.V, b.R) - computeC(a.E, a.W, a.V, a.R)
        );
        const cappedQualified = sortedQualified.slice(0, maxLeads);

        // 7. BATCH generer Why Now (no feedback injection per Addendum §5)
        let whyNowTexts: Map<string, string> = new Map();
        if (cappedQualified.length > 0) {
            whyNowTexts = await generateWhyNowBatch(cappedQualified);
            apiCallsUsed.gemini++;
        }

        // 8. Update Airtable in batches
        if (scoredCases.length > 0) {
            await batchCreateCaseFiles(scoredCases.map(c => {
                const C = computeC(c.E, c.W, c.V, c.R);
                const isQualified = cappedQualified.includes(c);
                const stars = isQualified ? computeStars(C) : 0;

                return {
                    company_name: c.company_name,
                    org_number: c.org_number,
                    trigger_hypothesis: c.seed.trigger_type || c.seed.trigger_detected || 'LeadershipChange',
                    E: Math.round(c.E * 100) / 100,
                    W: Math.round(c.W * 100) / 100,
                    V: c.V,
                    R: Math.round(c.R * 100) / 100,
                    status: isQualified ? 'qualified' : 'dropped',
                    why_now_text: whyNowTexts.get(c.org_number) || c.gemini_reasoning || '',
                    qualified_at: isQualified ? new Date().toISOString() : undefined,
                    created_at: new Date().toISOString(),
                    suggested_role: mapTriggerToRole(c.seed.trigger_type || c.seed.trigger_detected || ''),
                    report_date: new Date().toISOString().split('T')[0],
                    is_ostlandet: c.verification.is_ostlandet,
                    has_operations: c.verification.has_operations,
                    source_type: c.seed.source_type,
                };
            }));
            logger.info(`✅ batchCreateCaseFiles completed for ${scoredCases.length} records`, { mode, component: 'process-esl' });
            apiCallsUsed.airtable++;
        }

        // Mark Seeds as processed
        const seedIds = unprocessedSeeds.map(s => s.id);
        await batchUpdateSeedsStatus(seedIds, true);
        apiCallsUsed.airtable++;

        const duration = Date.now() - startTime;

        // Response format depends on mode (Addendum §3)
        if (mode === 'production') {
            // Production: stars only, no numerical scores
            return NextResponse.json({
                success: true,
                mode,
                qualified: cappedQualified.length,
                dropped: dropped.length,
                leads: cappedQualified.map(c => ({
                    company_name: c.company_name,
                    stars: computeStars(computeC(c.E, c.W, c.V, c.R)),
                    why_now_text: whyNowTexts.get(c.org_number) || '',
                    suggested_role: mapTriggerToRole(c.seed.trigger_type || c.seed.trigger_detected || ''),
                })),
                duration: `${duration}ms`,
            });
        }

        // Test mode: full scores and explanation
        return NextResponse.json({
            success: true,
            mode,
            processed: unprocessedSeeds.length,
            qualified: cappedQualified.length,
            dropped: dropped.length,
            skipped: unprocessedSeeds.length - toScore.length,
            leads: cappedQualified.map(c => {
                const C = computeC(c.E, c.W, c.V, c.R);
                return {
                    company_name: c.company_name,
                    org_number: c.org_number,
                    C: Math.round(C * 100) / 100,
                    E: Math.round(c.E * 100) / 100,
                    W: Math.round(c.W * 100) / 100,
                    V: c.V,
                    R: Math.round(c.R * 100) / 100,
                    stars: computeStars(C),
                    trigger: c.seed.trigger_type || c.seed.trigger_detected,
                    suggested_role: mapTriggerToRole(c.seed.trigger_type || c.seed.trigger_detected || ''),
                    why_now_text: whyNowTexts.get(c.org_number) || '',
                    reasoning: c.gemini_reasoning || '',
                };
            }),
            duration: `${duration}ms`,
            apiCalls: apiCallsUsed,
            efficiency: `${(unprocessedSeeds.length / (apiCallsUsed.gemini + apiCallsUsed.bronnysund + apiCallsUsed.airtable)).toFixed(1)} seeds/API call`
        });

    } catch (error) {
        logger.error('ESL Processing error:', error, { mode, component: 'process-esl' });
        return NextResponse.json(
            { error: 'Processing failed', details: String(error) },
            { status: 500 }
        );
    }
}

function mapTriggerToRole(trigger: string): string {
    const mapping: Record<string, string> = {
        LeadershipChange: 'CEO',
        Restructuring: 'CFO',
        MergersAcquisitions: 'CEO',
        StrategicReview: 'CEO',
        OperationalCrisis: 'COO',
        RegulatoryLegal: 'CEO',
        CostProgram: 'CFO',
        HiringSignal: 'CEO',
        OwnershipGovernance: 'CFO',
        TransformationProgram: 'COO',
    };
    return mapping[trigger] || 'CEO';
}

// Allow GET for testing
export async function GET(request: NextRequest) {
    return POST(request);
}
