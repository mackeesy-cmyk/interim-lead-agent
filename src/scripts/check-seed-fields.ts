/**
 * Check actual field values for seeds
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function checkSeedFields() {
    const seeds = base('Seeds');
    const allSeeds: any[] = [];

    await seeds
        .select({ maxRecords: 50 })
        .eachPage((records, fetchNextPage) => {
            allSeeds.push(...records);
            fetchNextPage();
        });

    console.log(`📊 Found ${allSeeds.length} seeds\n`);

    // Check first 3 seeds in detail
    console.log('🔍 Detailed view of first 3 seeds:\n');
    allSeeds.slice(0, 3).forEach((seed, i) => {
        console.log(`Seed ${i + 1}:`);
        console.log(`  ID: ${seed.id}`);
        console.log(`  Fields:`, JSON.stringify(seed.fields, null, 2));
        console.log('');
    });

    // Check for processing_status field
    console.log('\n📋 Processing status field values:');
    const statusValues = allSeeds.map(s => s.fields.processing_status || s.fields.processed || 'MISSING');
    const uniqueStatuses = [...new Set(statusValues)];
    console.log('  Unique values:', uniqueStatuses);

    // Count by processing_status
    const byProcessingStatus: Record<string, number> = {};
    allSeeds.forEach(s => {
        const status = s.fields.processing_status || 'MISSING';
        byProcessingStatus[status] = (byProcessingStatus[status] || 0) + 1;
    });
    console.log('  Counts:', byProcessingStatus);

    // Check processed field
    console.log('\n✅ "processed" boolean field:');
    const byProcessed: Record<string, number> = {};
    allSeeds.forEach(s => {
        const processed = s.fields.processed === undefined ? 'MISSING' : String(s.fields.processed);
        byProcessed[processed] = (byProcessed[processed] || 0) + 1;
    });
    console.log('  Counts:', byProcessed);
}

checkSeedFields().catch(console.error);
