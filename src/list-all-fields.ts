import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        console.log('Querying for ALL records in CaseFiles...');
        const records = await caseFiles.select({
            maxRecords: 10
        }).all();

        console.log(`Returned ${records.length} records.`);

        if (records.length > 0) {
            records.forEach((r, i) => {
                console.log(`\n--- Record ${i + 1} (${r.id}) ---`);
                console.log('Fields:', JSON.stringify(r.fields, null, 2));
            });
        }
    } catch (error: any) {
        console.error('Query failed:', error.message);
    }
}

test();
