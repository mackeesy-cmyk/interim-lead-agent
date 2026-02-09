import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        const records = await caseFiles.select({
            filterByFormula: "OR({company_name} = 'Bilia', {org_number} = 'Bilia')",
        }).all();
        console.log(`Matching CaseFiles: ${records.length}`);
        records.forEach(r => {
            console.log(`- ${r.get('company_name')} [${r.get('status')}]`);
        });
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
