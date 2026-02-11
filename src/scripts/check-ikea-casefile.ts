/**
 * Check Ikea Norge CaseFile to see if article was scraped
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function checkIkeaCaseFile() {
    const caseFiles = base('CaseFiles');

    const records = await caseFiles
        .select({
            filterByFormula: `{company_name} = "Ikea Norge"`,
            maxRecords: 5,
        })
        .firstPage();

    console.log(`Found ${records.length} Ikea Norge CaseFiles\n`);

    records.forEach((record, i) => {
        const f = record.fields as any;
        console.log(`CaseFile ${i + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Status: ${f.status}`);
        console.log(`  Quality: ${f.quality_score || 0}/100`);
        console.log(`  Source: ${f.source_type}`);
        console.log(`  Case Summary Length: ${(f.case_summary || '').length} chars`);
        console.log(`  Why Now Length: ${(f.why_now_text || '').length} chars`);

        console.log(`\n  Case Summary:`);
        console.log(`  ${(f.case_summary || 'N/A').slice(0, 300)}...\n`);

        // Check if it has "FULL ARTIKKEL" marker (from deep scraping)
        const hasFullArticle = (f.case_summary || '').includes('FULL ARTIKKEL');
        console.log(`  Has full article scraped: ${hasFullArticle ? '✅ YES' : '❌ NO'}\n`);
    });
}

checkIkeaCaseFile().catch(console.error);
