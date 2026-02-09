import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        console.log('Introspecting CaseFiles records...');
        const records = await caseFiles.select({
            maxRecords: 5,
        }).all();

        if (records.length > 0) {
            records.forEach((r, i) => {
                console.log(`\n--- Record ${i + 1} (${r.id}) ---`);
                console.log('Raw Fields:', JSON.stringify(r.fields, null, 2));
            });
        } else {
            console.log('No records found in CaseFiles');
        }
    } catch (error: any) {
        console.error('Query failed:', error.message);
    }
}

test();
