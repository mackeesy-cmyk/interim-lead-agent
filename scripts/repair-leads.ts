// CRITICAL: Load env before imports that use them
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Airtable from 'airtable';
import { generateWhyNowBatch } from '../src/lib/gemini';
import { batchUpdateCaseFiles } from '../src/lib/airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFilesTable = base('CaseFiles');

async function repair() {
    try {
        console.log('🔍 Finding qualified leads with missing analysis...');

        const records = await caseFilesTable.select({
            filterByFormula: "AND({status} = 'qualified', OR({why_now_text} = '', {why_now_text} = BLANK()))",
        }).all();

        console.log(`💡 Found ${records.length} leads to repair.`);

        if (records.length === 0) {
            console.log('✅ Nothing to repair.');
            return;
        }

        // Process in batches of 10 for Gemini
        const BATCH_SIZE = 10;
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            const scoredCases = batch.map(r => ({
                id: r.id,
                org_number: (r.get('org_number') as string) || 'N/A',
                company_name: (r.get('company_name') as string) || 'Unknown',
                seed: {
                    trigger_type: (r.get('trigger_hypothesis') as string) || 'LeadershipChange',
                    excerpt: (r.get('excerpt') as string) || (r.get('why_now_text') as string) || ''
                },
                E: (r.get('E') as number) || 0.5,
                W: (r.get('W') as number) || 0.5,
                V: (r.get('V') as number) || 1,
                R: (r.get('R') as number) || 0.1,
            }));

            console.log(`🤖 Generating analysis for batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
            const whyNowMap = await generateWhyNowBatch(scoredCases as any);

            const updates = batch.map(r => {
                const orgNr = (r.get('org_number') as string) || 'N/A';
                const text = whyNowMap.get(orgNr);
                return {
                    id: r.id,
                    fields: {
                        why_now_text: text || 'Analysis generated post-qualification.'
                    }
                };
            });

            await batchUpdateCaseFiles(updates);
            console.log(`✅ Updated ${updates.length} leads.`);
        }

        console.log('🏁 Repair complete!');
    } catch (error) {
        console.error('❌ Repair failed:', error);
    }
}

repair();
