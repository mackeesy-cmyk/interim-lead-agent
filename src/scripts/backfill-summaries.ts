
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function backfill() {
    // Dynamically import everything that depends on env vars
    const { getCaseFiles, seeds, batchUpdateCaseFiles } = await import('@/lib/airtable');
    const { generateSummaryBatch } = await import('@/lib/gemini');
    const { logger } = await import('@/lib/logger');

    // Also trigger the env check
    try {
        await import('@/lib/env');
    } catch (e: any) {
        logger.error(`Env validation failed: ${e.message}`);
        return;
    }

    logger.info('🚀 Starting backfill of news summaries...');

    try {
        // 1. Fetch all qualified case files
        const leads = await getCaseFiles('qualified');
        const missingLeads = leads.filter(l => !l.case_summary || l.case_summary.trim() === '');

        if (missingLeads.length === 0) {
            logger.info('✅ No leads missing summaries. Everything looks good!');
            return;
        }

        logger.info(`🔍 Found ${missingLeads.length} leads missing summaries.`);

        // 2. Fetch all seeds to match content
        const seedRecords = await seeds.select({
            filterByFormula: "{processed} = 1"
        }).all();

        const allSeeds = seedRecords.map(r => ({
            id: r.id,
            ...(r.fields as any)
        }));

        logger.info(`📦 Loaded ${allSeeds.length} processed seeds for matching.`);

        // 3. Match leads to seeds and prepare for batching
        const casesToSummarize: any[] = [];
        const leadRecordMap = new Map<string, string>(); // identifier -> CaseFile ID

        for (const lead of missingLeads) {
            const orgNr = lead.org_number?.replace(/\s/g, '');
            // Try to find matching seed
            const matchingSeed = allSeeds.find(s =>
                (s.org_number?.replace(/\s/g, '') === orgNr && orgNr !== '') ||
                (s.company_name === lead.company_name)
            );

            if (matchingSeed) {
                const key = lead.org_number || matchingSeed.org_number || lead.id!;
                casesToSummarize.push({
                    company_name: lead.company_name,
                    org_number: key,
                    seed: matchingSeed
                });
                leadRecordMap.set(key, lead.id!);
            } else {
                logger.warn(`⚠️ Could not find matching seed for: ${lead.company_name}`);
            }
        }

        if (casesToSummarize.length === 0) {
            logger.warn('❌ No matching seeds found for any missing summaries.');
            return;
        }

        logger.info(`🤖 Generating summaries for ${casesToSummarize.length} leads via Gemini batch...`);

        // 4. Batch generate summaries
        const summaries = await generateSummaryBatch(casesToSummarize);

        // 5. Update Airtable
        const updates: Array<{ id: string; fields: Partial<any> }> = [];
        for (const [key, summary] of summaries.entries()) {
            const leadId = leadRecordMap.get(key);
            if (leadId && summary) {
                updates.push({
                    id: leadId,
                    fields: { case_summary: summary }
                });
            }
        }

        if (updates.length > 0) {
            logger.info(`✍️ Updating ${updates.length} records in Airtable...`);
            await batchUpdateCaseFiles(updates);
            logger.info('✅ Backfill complete!');
        } else {
            logger.warn('⚠️ No summaries were generated or matched.');
        }

    } catch (error) {
        logger.error('❌ Backfill failed:', error);
    }
}

backfill();
