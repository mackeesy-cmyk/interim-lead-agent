/**
 * Find a specific seed by company name
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function findSeed(companyName: string) {
    const seeds = base('Seeds');

    const records = await seeds
        .select({
            filterByFormula: `{company_name} = "${companyName}"`,
            maxRecords: 5,
        })
        .firstPage();

    console.log(`Found ${records.length} seeds for: ${companyName}\n`);

    records.forEach((seed, i) => {
        console.log(`Seed ${i + 1}:`);
        console.log(`  ID: ${seed.id}`);
        console.log(`  Fields:`, JSON.stringify(seed.fields, null, 2));
        console.log('');
    });
}

const companyName = process.argv[2];

if (!companyName) {
    console.log('Usage: npx tsx src/scripts/find-seed.ts "Company Name"');
    process.exit(1);
}

findSeed(companyName).catch(console.error);
