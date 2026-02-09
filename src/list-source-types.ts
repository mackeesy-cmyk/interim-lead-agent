import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const seeds = base('Seeds');

async function test() {
    try {
        const records = await seeds.select({
            fields: ['source_type'],
        }).all();
        const types = new Set(records.map(r => r.get('source_type')));
        console.log('Existing source_type options in DB:');
        types.forEach(t => console.log(`- "${t}"`));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
