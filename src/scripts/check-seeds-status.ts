/**
 * Check current Seeds table status
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function checkSeedsStatus() {
    console.log('🔍 Checking Seeds table status...\n');

    const seeds = base('Seeds');
    const allSeeds: any[] = [];

    await seeds
        .select({ maxRecords: 100 })
        .eachPage((records, fetchNextPage) => {
            allSeeds.push(...records);
            fetchNextPage();
        });

    console.log(`📊 Total seeds in Airtable: ${allSeeds.length}\n`);

    // Group by status
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    allSeeds.forEach((seed) => {
        const status = seed.fields.processing_status || 'unknown';
        const source = seed.fields.source_type || 'unknown';

        byStatus[status] = (byStatus[status] || 0) + 1;
        bySource[source] = (bySource[source] || 0) + 1;
    });

    console.log('📋 Seeds by processing status:');
    Object.entries(byStatus)
        .sort(([, a], [, b]) => b - a)
        .forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });

    console.log('\n📰 Seeds by source type:');
    Object.entries(bySource)
        .sort(([, a], [, b]) => b - a)
        .forEach(([source, count]) => {
            console.log(`   ${source}: ${count}`);
        });

    // Show some sample seeds
    console.log('\n📄 Sample seeds (most recent 5):');
    allSeeds.slice(0, 5).forEach((seed, i) => {
        console.log(
            `   ${i + 1}. ${seed.fields.company_name || 'Unknown'} | ${seed.fields.source_type} | Status: ${seed.fields.processing_status || 'pending'}`
        );
    });
}

checkSeedsStatus().catch(console.error);
