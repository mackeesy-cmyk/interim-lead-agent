import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        console.log('Querying RECENT CaseFiles records...');
        const records = await caseFiles.select({
            maxRecords: 10,
            sort: [{ field: 'created_at', direction: 'desc' }],
        }).all();
        console.log(`Found ${records.length} recent records in CaseFiles.`);

        if (records.length > 0) {
            records.forEach((r, i) => {
                const fields = Object.keys(r.fields);
                console.log(`\nRecord ${i + 1} (${r.id}):`);
                console.log(`  Fields: [${fields.join(', ')}]`);

                const companyName = r.get('company_name');
                console.log(`  Name: ${companyName}`);

                const whyNow = r.get('why_now_text');
                if (whyNow) {
                    console.log(`  WhyNow found! Length: ${String(whyNow).length}`);
                } else {
                    console.log(`  WhyNow: MISSING/NULL`);
                }
            });
        }
    } catch (error: any) {
        console.error('Data query failed:', error.message);
    }
}

test();
