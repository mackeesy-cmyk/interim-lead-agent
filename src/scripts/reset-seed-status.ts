/**
 * Reset processed status for all seeds to allow reprocessing
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function resetSeedStatus() {
    const seeds = base('Seeds');
    const allSeeds: any[] = [];

    console.log('🔍 Fetching all seeds...\n');

    await seeds
        .select({ maxRecords: 200 })
        .eachPage((records, fetchNextPage) => {
            allSeeds.push(...records);
            fetchNextPage();
        });

    console.log(`📊 Found ${allSeeds.length} seeds`);

    // Filter seeds that have processed=true
    const processedSeeds = allSeeds.filter(s => s.fields.processed === true);
    console.log(`   ${processedSeeds.length} seeds marked as processed`);
    console.log(`   ${allSeeds.length - processedSeeds.length} seeds already pending\n`);

    if (processedSeeds.length === 0) {
        console.log('✅ No seeds need resetting.');
        return;
    }

    console.log(`⚠️  This will reset ${processedSeeds.length} seeds to allow reprocessing.\n`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('💾 Resetting processed status...\n');

    // Update in batches of 10 (Airtable API limit)
    for (let i = 0; i < processedSeeds.length; i += 10) {
        const batch = processedSeeds.slice(i, i + 10);

        await Promise.all(
            batch.map(seed =>
                seeds.update(seed.id, { processed: false }).catch(err => {
                    console.error(`   Error updating ${seed.id}:`, err.message);
                })
            )
        );

        console.log(`   Reset ${Math.min(i + 10, processedSeeds.length)}/${processedSeeds.length} seeds`);
    }

    console.log('\n✅ All seeds reset! Ready for reprocessing.');
    console.log(`\n💡 Run: curl -X GET "http://localhost:3000/api/process-esl?mode=test" -H "Authorization: Bearer dev-secret-123"`);
}

resetSeedStatus().catch(console.error);
