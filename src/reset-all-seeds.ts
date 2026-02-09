import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const seeds = base('Seeds');

async function resetAllSeeds() {
    try {
        console.log('Fetching all seeds to reset...');
        const records = await seeds.select({
            filterByFormula: "{processed} = 1"
        }).all();

        if (records.length === 0) {
            console.log('No processed seeds found');
            return;
        }

        console.log(`Resetting ${records.length} seeds...`);

        // Airtable supports updates in batches of 10
        for (let i = 0; i < records.length; i += 10) {
            const batch = records.slice(i, i + 10);
            await seeds.update(batch.map(r => ({
                id: r.id,
                fields: { processed: false }
            })));
            console.log(`  Reset batch ${Math.floor(i / 10) + 1}`);
        }

        console.log('✅ All seeds reset successfully');
    } catch (error: any) {
        console.error('Reset failed:', error.message);
    }
}

resetAllSeeds();
