import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const seeds = base('Seeds');

async function test() {
    try {
        const records = await seeds.select({
            maxRecords: 50,
            sort: [{ field: 'collected_at', direction: 'desc' }],
        }).all();
        console.log(`Total seeds found: ${records.length}`);
        records.forEach(r => {
            console.log(`- ${r.get('company_name')} (${r.get('source_type')}) [Processed: ${r.get('processed')}]`);
        });
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
