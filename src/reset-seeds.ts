import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const seeds = base('Seeds');

async function resetSeeds() {
    try {
        console.log('Fetching last 10 seeds...');
        const records = await seeds.select({
            maxRecords: 10,
            sort: [{ field: 'collected_at', direction: 'desc' }],
        }).all();

        if (records.length === 0) {
            console.log('No seeds found');
            return;
        }

        console.log(`Resetting ${records.length} seeds...`);

        // Airtable supports updates in batches of 10
        await seeds.update(records.map(r => ({
            id: r.id,
            fields: { processed: false }
        })));

        console.log('✅ Seeds reset successfully');
    } catch (error: any) {
        console.error('Reset failed:', error.message);
    }
}

resetSeeds();
