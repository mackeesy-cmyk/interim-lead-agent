/**
 * Google Gemini Integration for ESL+ Lead Qualification
 * Optimalisert for batch-prosessering for å minimere API-kall
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ============================================
// TYPES
// ============================================
export interface SeedData {
    seed: any;
    company_name: string;
    org_number: string;
    E: number;
    W: number;
    V: number;
    R: number;
    brreg_data?: any;
    source_count?: number;
    merged_triggers?: string[];
}

export interface ScoredCase extends SeedData {
    gemini_reasoning?: string;
    verification?: any;
}

export interface FinnParsedJob {
    company_name: string;
    role: string;
    urgency_signals: string[];
    url: string;
}

export interface BrregKunngjoringParsed {
    company_name: string;
    org_number: string;
    announcement_type: string;
    trigger_category: string;
    excerpt: string;
}

// ============================================
// HELPERS
// ============================================
/**
 * Robust JSON extraction from Gemini response
 */
function cleanJson(text: string): string {
    // 1. Remove markdown code blocks (```json ... ```)
    let clean = text.replace(/```(?:json)?([\s\S]*?)```/gi, '$1').trim();

    // 2. Find the outer-most JSON object or array
    const firstOpenBrace = clean.indexOf('{');
    const firstOpenBracket = clean.indexOf('[');

    let start = -1;
    let end = -1;

    // Determine if object or array comes first
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        start = firstOpenBrace;
        end = clean.lastIndexOf('}');
    } else if (firstOpenBracket !== -1) {
        start = firstOpenBracket;
        end = clean.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1 && end > start) {
        clean = clean.substring(start, end + 1);
    }

    // 3. Remove trailing commas which break JSON.parse
    clean = clean.replace(/,\s*([\]}])/g, '$1');

    return clean;
}

function truncate(text: string | undefined, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

// ============================================
// BATCH SCORING
// ============================================
export async function batchProcessSeeds(
    cases: SeedData[],
    feedback: any[] = []
): Promise<ScoredCase[]> {
    if (cases.length === 0) return [];

    const prompt = buildBatchScoringPrompt(cases, feedback);

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
            },
        });

        const responseText = result.response.text();
        const jsonStr = cleanJson(responseText);
        const scores = JSON.parse(jsonStr);

        return cases.map((c) => {
            const orgNr = c.org_number.replace(/\s/g, '');
            // Find score by org number or company name as fallback
            const score = scores.cases?.find((s: any) =>
                (s.org_number && s.org_number.replace(/\s/g, '') === orgNr) ||
                (s.company_name && s.company_name === c.company_name)
            );

            return {
                ...c,
                E: score?.E ?? c.E,
                W: score?.W ?? c.W,
                R: score?.R ?? c.R,
                gemini_reasoning: score?.reasoning || 'No reasoning provided by AI',
            };
        });
    } catch (error) {
        console.error('Gemini batch scoring failed:', error);
        return cases as ScoredCase[];
    }
}

function buildBatchScoringPrompt(cases: SeedData[], feedback: any[] = []): string {
    const caseSummaries = cases.map((c, i) => `
Case ${i + 1}:
- Company: ${c.company_name}
- Org.nr: ${c.org_number}
- Source: ${c.seed.source_type}
- Sources corroborating: ${c.source_count || 1}
- Trigger(s): ${c.merged_triggers?.join(', ') || c.seed.trigger_type || c.seed.trigger_detected || 'unknown'}
- Content: ${truncate(c.seed.raw_content || c.seed.excerpt, 600)}
- Brønnøysund verified: ${c.V === 1 ? 'Yes' : 'No'}
- Industry: ${c.brreg_data?.naeringskode1?.beskrivelse || 'Unknown'}
- Employees: ${c.brreg_data?.antallAnsatte || 'Unknown'}
- Company type: ${c.brreg_data?.organisasjonsform?.beskrivelse || 'Unknown'}
- Location: ${c.brreg_data?.forretningsadresse?.kommune || 'Unknown'}
`).join('\n---\n');

    return `
You are an expert B2B lead qualification system for a Norwegian interim management firm.
The firm provides temporary C-level executives (daglig leder, CFO, COO, transformation lead)
to companies experiencing crises, leadership gaps, or major transitions.

Score each case on three dimensions (0.0 to 1.0):
- E (Evidence strength): How reliable and specific is the signal?
  Multiple independent sources = higher E. Official registry data = higher E.
  Vague news mention = lower E.
- W (Will/Need): How likely does this company need interim leadership RIGHT NOW?
  Active crisis + leadership gap = high W. Routine change = low W.
  Consider: Is this a situation where an external interim leader adds value?
- R (Risk): Risk of false positive, bad timing, or unsuitable lead.
  Company already fully in liquidation = higher R (too late).
  Multiple sources confirming = lower R.

KEY ASSESSMENT CRITERIA:
- A bankruptcy/restructuring with 30+ employees and no CEO = HIGH W (urgent interim need)
- A role change where a new CEO is already appointed = LOW W (gap already filled)
- A restructuring with ongoing operations = HIGH W (needs operational leadership)
- Multiple independent sources confirming same crisis = HIGH E, LOW R
- Pure job postings without crisis context = LOW W

TRIGGER ONTOLOGY:
1. Leadership changes
2. Organizational restructuring
3. M&A activity
4. Rapid growth
5. Turnaround situations
6. Digital transformation
7. IPO preparation
8. Succession planning
9. Crisis management
10. Regulatory changes

CASES TO SCORE:
${caseSummaries}

Respond ONLY with valid JSON:
{
  "cases": [
    { "org_number": "9-digits", "company_name": "...", "E": 0.75, "W": 0.60, "R": 0.20, "reasoning": "Brief explanation of interim leadership fit" },
    ...
  ]
}
`;
}

// ============================================
// BATCH WHY-NOW GENERATION
// ============================================
export async function generateWhyNowBatch(
    qualifiedCases: ScoredCase[],
    feedback: any[] = []
): Promise<Map<string, string>> {
    if (qualifiedCases.length === 0) return new Map();

    const prompt = buildWhyNowBatchPrompt(qualifiedCases, feedback);

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
            },
        });

        const responseText = result.response.text();
        const jsonStr = cleanJson(responseText);
        const parsed = JSON.parse(jsonStr);

        const results = new Map<string, string>();
        qualifiedCases.forEach((c) => {
            const orgNr = c.org_number.replace(/\s/g, '');
            const match = parsed.why_now?.find((w: any) =>
                (w.org_number && w.org_number.replace(/\s/g, '') === orgNr) ||
                (w.company_name && w.company_name === c.company_name)
            );
            results.set(c.org_number, match?.message || match || '');
        });

        return results;
    } catch (error) {
        console.error('Gemini Why Now generation failed:', error);
        return new Map();
    }
}

// ============================================
// BATCH SUMMARY GENERATION
// ============================================
export async function generateSummaryBatch(
    cases: ScoredCase[]
): Promise<Map<string, string>> {
    if (cases.length === 0) return new Map();

    const caseSummaries = cases.map((c, i) => `
Case ${i + 1} (${c.company_name}):
- Content: ${truncate(c.seed.raw_content || c.seed.excerpt, 500)}
`).join('\n');

    const prompt = `
Lag et ekstremt kort sammendrag (maks 1 setning) på norsk av nyhetssaken for hvert selskap. 
Sammendraget skal være nøkternt og beskrive selve hendelsen.

VIKTIG: Svar med KOMPLETT og VALID JSON. Ikke avbryt midt i.

CASES:
${caseSummaries}

Respond ONLY with valid JSON:
{
  "summaries": [
    { "org_number": "...", "company_name": "...", "summary": "Kort oppsummering..." },
    ...
  ]
}
`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
            },
        });

        const responseText = result.response.text();
        const jsonStr = cleanJson(responseText);

        try {
            const parsed = JSON.parse(jsonStr);

            const results = new Map<string, string>();
            cases.forEach((c) => {
                const orgNr = c.org_number.replace(/\s/g, '');
                const match = parsed.summaries?.find((w: any) =>
                    (w.org_number && w.org_number.replace(/\s/g, '') === orgNr) ||
                    (w.company_name && w.company_name === c.company_name)
                );
                results.set(c.org_number, match?.summary || '');
            });

            return results;
        } catch (e) {
            console.error('Failed to parse Gemini summary JSON. Raw response:', responseText);
            throw e;
        }
    } catch (error) {
        console.error('Gemini Summary generation failed:', error);
        return new Map();
    }
}

function buildWhyNowBatchPrompt(cases: ScoredCase[], feedback: any[] = []): string {
    const caseSummaries = cases.map((c, i) => `
Case ${i + 1} (${c.company_name}):
- Trigger: ${c.seed.trigger_type || c.seed.trigger_detected}
- Content: ${truncate(c.seed.raw_content || c.seed.excerpt, 200)}
- E=${c.E.toFixed(2)}, W=${c.W.toFixed(2)}
`).join('\n');

    return `
Generate compelling "Why Now" messages for a Norwegian interim management firm.
Each message should be 2-3 sentences in Norwegian, professional, and reference the trigger.

CASES:
${caseSummaries}

Respond ONLY with valid JSON:
{
  "why_now": [
    { "org_number": "...", "company_name": "...", "message": "Message in Norwegian..." },
    ...
  ]
}
`;
}

// ============================================
// PARSERS
// ============================================
export async function parseFinnResults(markdown: string, searchQuery: string): Promise<FinnParsedJob[]> {
    const prompt = `
Finn.no search query: "${searchQuery}"
Extract ALL job listings.
Rules:
- company_name: Employer name (not agency unless unclear)
- role: Job title
- urgency_signals: e.g. "interim", "snarest", "vikariat"
- url: Job link

CONTENT:
"${truncate(markdown, 4000)}"

Respond ONLY with valid JSON:
{
    "jobs": [
        { "company_name": "...", "role": "...", "urgency_signals": ["..."], "url": "..." }
    ]
}
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        });

        const responseText = result.response.text();
        const jsonStr = cleanJson(responseText);
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed.jobs) ? parsed.jobs : [];
    } catch (error) {
        console.error('FINN parsing failed:', error);
        return [];
    }
}

export async function parseBrregKunngjoringer(markdown: string): Promise<BrregKunngjoringParsed[]> {
    const prompt = `
Brønnøysundregistrene kunngjøringer logic.
Extract ALL announcements.
Fields: company_name, org_number, announcement_type, trigger_category (Restructuring/MergersAcquisitions), excerpt.

CONTENT:
"${truncate(markdown, 4000)}"

Respond ONLY with valid JSON:
{
    "announcements": [
        { "company_name": "...", "org_number": "...", "announcement_type": "...", "trigger_category": "...", "excerpt": "..." }
    ]
}
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        });

        const responseText = result.response.text();
        const jsonStr = cleanJson(responseText);
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed.announcements) ? parsed.announcements : [];
    } catch (error) {
        console.error('Brreg kunngjøringer parsing failed:', error);
        return [];
    }
}

export async function detectTriggers(content: string, type: string, source: string): Promise<any> {
    const prompt = `
        Analyze Norwegian ${type} content from ${source} for B2B triggers.
        
        TRIGGER ONTOLOGY:
        1. LeadershipChange
        2. Restructuring
        3. MergersAcquisitions
        4. StrategicReview
        5. OperationalCrisis
        6. RegulatoryLegal
        7. CostProgram
        8. HiringSignal
        9. OwnershipGovernance
        10. TransformationProgram

        CONTENT:
        "${truncate(content, 2000)}"

        Extract primary company and triggers.
        Respond ONLY with valid JSON:
        {
            "no_trigger_found": boolean,
            "triggers_found": [
                { "category": "category", "excerpt": "text" }
            ],
            "company_mentioned": {
                "name": "Name",
                "org_number": "9 digits or empty"
            },
            "E_score": 0.0-1.0
        }
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        });

        const responseText = result.response.text();
        const jsonStr = cleanJson(responseText);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Trigger detection failed:', error);
        return { no_trigger_found: true, triggers_found: [], company_mentioned: { name: 'Unknown', org_number: '' } };
    }
}

// ============================================
// LEGACY & UTILS
// ============================================
export async function scoreEvidence(seed: any, content: string, source: string, context: string): Promise<{ delta_E: number; delta_W: number; delta_R: number }> {
    const results = await batchProcessSeeds([{
        seed: { ...seed, raw_content: content },
        company_name: seed.company_name || 'Unknown',
        org_number: seed.org_number || '',
        E: seed.E || 0.5,
        W: seed.W || 0.5,
        V: seed.V || 0,
        R: seed.R || 0.3,
    }]);

    const r = results[0];
    return {
        delta_E: (r.E - (seed.E || 0.5)),
        delta_W: (r.W - (seed.W || 0.5)),
        delta_R: (r.R - (seed.R || 0.3))
    };
}

export async function selectNextSource(caseFile: any): Promise<string> {
    return 'skip';
}

export async function generateWhyNow(company: string, trigger: string, stars: number, evidence: any[], role: string): Promise<{ why_now_text: string }> {
    const results = await generateWhyNowBatch([{
        org_number: 'N/A',
        company_name: company,
        seed: { trigger_type: trigger, raw_content: evidence[0]?.excerpt || '' },
        E: 0.8, W: 0.8, V: 1, R: 0.1
    }]);
    return { why_now_text: results.get('N/A') || '' };
}

export async function formatReportSection(leads: any[]): Promise<string> {
    if (leads.length === 0) return '';
    const prompt = `
            Her er ukens kvalifiserte leads for interim ledelse. 
            Lag en kort, profesjonell oppsummering på norsk.
            LEADS:
            ${leads.map(l => `- ${l.company_name}: ${l.why_now_text}`).join('\n')}
        `;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return 'Feil ved generering av oppsummering.';
    }
}
