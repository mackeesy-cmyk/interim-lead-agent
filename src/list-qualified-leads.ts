import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        const records = await caseFiles.select({
            filterByFormula: "{status} = 'qualified'",
            sort: [{ field: 'stars', direction: 'desc' }],
        }).all();
        console.log(`Qualified leads found: ${records.length}`);
        records.forEach(r => {
            const whyNow = r.get('why_now_text') as string;
            console.log(`- ${r.get('company_name')} (${r.get('stars')} stars) - ${whyNow?.slice(0, 50)}...`);
        });
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
