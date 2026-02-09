import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        console.log('Querying for ANY records with a status...');
        const records = await caseFiles.select({
            filterByFormula: "NOT({status} = '')",
            maxRecords: 10
        }).all();

        console.log(`Found ${records.length} records with a status.`);

        if (records.length > 0) {
            records.forEach((r, i) => {
                console.log(`\n--- Record ${i + 1} (${r.id}) ---`);
                console.log(`Status: ${r.get('status')}`);
                console.log(`Company: ${r.get('company_name')}`);
                console.log(`Fields: ${Object.keys(r.fields).join(', ')}`);
            });
        }
    } catch (error: any) {
        console.error('Query failed:', error.message);
    }
}

test();
