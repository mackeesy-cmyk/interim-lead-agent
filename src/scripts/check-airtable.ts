import dotenv from 'dotenv';
import path from 'path';
import Airtable from 'airtable';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);

async function checkLeads() {
    console.log('Final Verification: Checking CaseFiles table...');
    try {
        const records = await base('CaseFiles').select({
            maxRecords: 10,
            sort: [{ field: 'created_at', direction: 'desc' }]
        }).all();

        console.log(`Found ${records.length} recent records in CaseFiles:`);
        records.forEach((r, i) => {
            console.log(`${i + 1}. ${r.get('company_name')} | Status: ${r.get('status')} | Stars: ${r.get('stars')} | Org: ${r.get('org_number')}`);
        });

        const qualifiedCount = records.filter(r => r.get('status') === 'qualified').length;
        console.log(`\nQualified Leads in this set: ${qualifiedCount}`);
    } catch (e) {
        console.error('Error fetching leads:', e);
    }
}

checkLeads();
