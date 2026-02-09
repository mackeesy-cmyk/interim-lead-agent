import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        const records = await caseFiles.select({
            maxRecords: 10,
        }).all();
        if (records.length > 0) {
            console.log('Available fields in CaseFiles:');
            // Union of all fields across first 10 records
            const fieldSet = new Set<string>();
            records.forEach(r => Object.keys(r.fields).forEach(f => fieldSet.add(f)));
            console.log(Array.from(fieldSet));

            records.forEach(r => {
                console.log(`- ${r.get('company_name')}: why_now_text val: "${r.get('why_now_text')}"`);
            });
        } else {
            console.log('No records found at all');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
