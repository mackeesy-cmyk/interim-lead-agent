/**
 * Cleanup Script: Re-evaluate all existing Airtable leads with new quality scoring
 *
 * This script:
 * 1. Fetches ALL CaseFiles from Airtable (qualified, dropped, pending)
 * 2. Runs AI quality analysis (generateStructuredAnalysisBatch) on each
 * 3. Updates leads with:
 *    - situasjonsanalyse (Norwegian situation analysis)
 *    - strategisk_begrunnelse (Norwegian strategic justification)
 *    - quality_score (0-100)
 *    - rejection_reason (if score < 60)
 * 4. Updates status: quality_score >= 60 → 'qualified', < 60 → 'dropped'
 */

// Load .env.local FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Import non-env-dependent modules
import Airtable from 'airtable';
import { CachedBrregLookup } from '../lib/bronnysund';

// NOTE: gemini.ts is loaded dynamically AFTER env vars are set (see below)

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);
const caseFiles = base('CaseFiles');

interface AirtableCaseFile {
    id: string;
    fields: {
        company_name?: string;
        org_number?: string;
        case_summary?: string;
        E?: number;
        W?: number;
        V?: number;
        R?: number;
        source_type?: string;
        trigger_hypothesis?: string;
        status?: string;
        why_now_text?: string;
    };
}

async function cleanupAirtableLeads() {
    // Debug: check if API keys are loaded
    console.log('🔑 Environment check:');
    console.log(`   AIRTABLE_API_KEY: ${process.env.AIRTABLE_API_KEY ? '✅ loaded' : '❌ missing'}`);
    console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ loaded' : '❌ missing'}`);
    console.log();

    console.log('🔍 Fetching all CaseFiles from Airtable...\n');

    // Dynamically import gemini AFTER env vars are loaded
    const { generateStructuredAnalysisBatch } = await import('../lib/gemini');

    // Fetch ALL records (not just qualified)
    const allRecords: AirtableCaseFile[] = [];
    await caseFiles
        .select({
            maxRecords: 1000,
            sort: [{ field: 'created_at', direction: 'desc' }],
        })
        .eachPage((records, fetchNextPage) => {
            allRecords.push(...(records as any));
            fetchNextPage();
        });

    console.log(`📊 Found ${allRecords.length} total leads in Airtable\n`);

    if (allRecords.length === 0) {
        console.log('No leads to process. Exiting.');
        return;
    }

    // Initialize Brreg cache for company lookups
    const brregCache = new CachedBrregLookup();

    // Batch lookup all companies first
    console.log('🔍 Looking up company data from Brønnøysund...\n');
    const orgNumbers = allRecords
        .map((r) => r.fields.org_number)
        .filter((orgNr): orgNr is string => !!orgNr);
    const companyData = await brregCache.batchLookup(orgNumbers);

    // Convert to ScoredCase format for Gemini
    console.log('🤖 Running AI quality analysis on all leads...\n');

    const scoredCases = allRecords.map((record) => {
        const fields = record.fields;
        const company = fields.org_number ? companyData.get(fields.org_number) : null;

        return {
            seed: {
                raw_content: fields.case_summary || fields.why_now_text || '',
                source_type: fields.source_type || 'unknown',
                trigger_type: fields.trigger_hypothesis,
                excerpt: fields.case_summary || '',
            },
            company_name: fields.company_name || 'Unknown',
            org_number: fields.org_number || '',
            E: fields.E || 0.5,
            W: fields.W || 0.4,
            V: fields.V || 0,
            R: fields.R || 0.3,
            brreg_data: company,
            record_id: record.id,
        };
    });

    // Run structured analysis in batches of 5 to avoid overwhelming Gemini
    const BATCH_SIZE = 5;
    const analysis = new Map<string, any>();

    for (let i = 0; i < scoredCases.length; i += BATCH_SIZE) {
        const batch = scoredCases.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(scoredCases.length / BATCH_SIZE);

        console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} leads)...`);

        try {
            const batchAnalysis = await generateStructuredAnalysisBatch(batch as any);
            // Merge into main analysis map
            for (const [key, value] of batchAnalysis.entries()) {
                analysis.set(key, value);
            }
            console.log(`   ✅ Batch ${batchNum} completed (${batchAnalysis.size} analyzed)`);
        } catch (error) {
            console.error(`   ⚠️  Batch ${batchNum} failed:`, error instanceof Error ? error.message : error);
        }

        // Small delay between batches to avoid rate limiting (not needed for last batch)
        if (i + BATCH_SIZE < scoredCases.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log(`\n✅ AI analysis complete for ${analysis.size}/${scoredCases.length} leads\n`);

    // Prepare updates
    const updates: Array<{
        id: string;
        fields: any;
        oldStatus: string;
        newStatus: string;
        score: number;
    }> = [];

    scoredCases.forEach((lead, index) => {
        const a = analysis.get(lead.org_number);
        if (!a) {
            console.log(`⚠️  ${lead.company_name}: No analysis generated (skipped)`);
            return;
        }

        const newStatus = a.quality_score >= 60 ? 'qualified' : 'dropped';
        const oldStatus = allRecords[index].fields.status || 'unknown';

        updates.push({
            id: lead.record_id,
            fields: {
                quality_score: a.quality_score,
                situasjonsanalyse: a.situasjonsanalyse,
                strategisk_begrunnelse: a.strategisk_begrunnelse,
                status: newStatus,
                rejection_reason: newStatus === 'dropped' ? a.rejection_reason : undefined,
            },
            oldStatus,
            newStatus,
            score: a.quality_score,
        });
    });

    console.log('\n📋 RE-EVALUATION RESULTS:\n');
    console.log('─'.repeat(80));

    let kept = 0;
    let dropped = 0;
    let statusChanged = 0;

    updates.forEach((update) => {
        const statusIcon = update.newStatus === 'qualified' ? '✅' : '❌';
        const changeIcon = update.oldStatus !== update.newStatus ? ' 🔄' : '';

        const casefile = scoredCases.find((c) => c.record_id === update.id);
        console.log(
            `${statusIcon} ${casefile?.company_name}: ${update.oldStatus} → ${update.newStatus} (score: ${update.score})${changeIcon}`
        );

        if (update.newStatus === 'qualified') kept++;
        else dropped++;

        if (update.oldStatus !== update.newStatus) statusChanged++;
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total processed: ${updates.length}`);
    console.log(`   ✅ Qualified: ${kept}`);
    console.log(`   ❌ Dropped: ${dropped}`);
    console.log(`   🔄 Status changed: ${statusChanged}\n`);

    // Ask for confirmation
    console.log('⚠️  This will update all records in Airtable.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Update Airtable in batches of 10
    console.log('💾 Updating Airtable...\n');

    for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10);
        await Promise.all(
            batch.map((update) =>
                caseFiles.update(update.id, update.fields).catch((err) => {
                    console.error(`Error updating ${update.id}:`, err.message);
                })
            )
        );
        console.log(`   Updated ${Math.min(i + 10, updates.length)}/${updates.length} records`);
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`\n📊 FINAL STATS:`);
    console.log(`   ${kept} qualified leads ready to show on frontend`);
    console.log(`   ${dropped} dropped leads (quality_score < 60)`);
    console.log(`   ${statusChanged} leads had their status changed\n`);
}

cleanupAirtableLeads().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
