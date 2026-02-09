import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const seeds = base('Seeds');

async function test() {
    try {
        console.log('Attempting to create seed...');
        const record = await seeds.create([
            {
                fields: {
                    company_name: 'Test Company AS',
                    org_number: '123456789',
                    source_type: 'test',
                    source_url: 'https://example.com',
                    trigger_detected: 'LeadershipChange',
                    excerpt: 'This is a test seed.',
                    collected_at: new Date().toISOString(),
                    processed: false
                }
            }
        ]);
        console.log(`Successfully created seed: ${record[0].id}`);
    } catch (error) {
        console.error('Create seed failed:', error);
    }
}

test();
