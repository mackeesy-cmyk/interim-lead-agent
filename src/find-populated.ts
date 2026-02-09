import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        console.log('Fetching most recent records to match screenshot...');
        const records = await caseFiles.select({
            maxRecords: 50,
        }).all();

        console.log(`Retrieved ${records.length} total records.`);

        // Find records that have MORE than just C and stars
        const populated = records.filter(r => Object.keys(r.fields).length > 2);
        console.log(`${populated.length} records have more than just formula fields.`);

        populated.slice(0, 5).forEach(r => {
            console.log(`\n--- Populated Record (${r.id}) ---`);
            console.log(JSON.stringify(r.fields, null, 2));
        });

        if (populated.length === 0 && records.length > 0) {
            console.log('\nSample record from the empty ones:');
            console.log(JSON.stringify(records[0].fields, null, 2));
        }

    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

test();
