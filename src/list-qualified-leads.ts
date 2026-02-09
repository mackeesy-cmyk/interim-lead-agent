import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
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
            const sourceType = r.get('source_type') || 'unknown';
            const orgNumber = r.get('org_number') || 'N/A';
            console.log(`- [${sourceType}] ${r.get('company_name')} (${orgNumber}) - ${r.get('stars')} stars - Analysis: ${whyNow ? 'YES' : 'NO'} (${whyNow?.slice(0, 30)}...)`);
        });
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
