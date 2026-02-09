import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const seeds = base('Seeds');

async function test() {
    try {
        const records = await seeds.select({
            filterByFormula: "NOT({processed})",
        }).all();
        console.log(`Unprocessed seeds: ${records.length}`);
        records.slice(0, 10).forEach(r => {
            console.log(`- ${r.get('company_name')} (${r.get('source_type')}) [${r.get('collected_at')}]`);
        });
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
