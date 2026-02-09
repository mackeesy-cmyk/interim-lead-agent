import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        console.log('Querying for QUALIFIED leads with data...');
        const records = await caseFiles.select({
            filterByFormula: "{status} = 'qualified'",
            sort: [{ field: 'created_at', direction: 'desc' }],
            maxRecords: 10
        }).all();

        console.log(`Found ${records.length} qualified leads.`);

        if (records.length > 0) {
            records.forEach((r, i) => {
                console.log(`\n--- Lead ${i + 1} (${r.id}) ---`);
                console.log(`Company: ${r.get('company_name')}`);
                console.log(`Why Now: ${r.get('why_now_text') ? 'YES' : 'NO'}`);
                if (r.get('why_now_text')) {
                    console.log(`Content: ${String(r.get('why_now_text')).slice(0, 50)}...`);
                }
            });
        }
    } catch (error: any) {
        console.error('Query failed:', error.message);
    }
}

test();
