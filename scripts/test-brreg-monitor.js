
import { fetchBrregUpdates } from '../src/lib/bronnysund';

async function testmonitor() {
    console.log('--- Testing Brreg Update Monitor ---');

    try {
        // Look back 7 days to ensure we find *something* for testing purposes
        const updates = await fetchBrregUpdates(7);

        console.log(`\n✅ Found ${updates.length} updates.`);

        if (updates.length > 0) {
            console.log('\nSample Update:');
            console.log(JSON.stringify(updates[0], null, 2));

            const roleChanges = updates.filter(u => u.change_type === 'role_change');
            console.log(`\nRole Changes found: ${roleChanges.length}`);
            if (roleChanges.length > 0) {
                console.log('Sample Role Change:', JSON.stringify(roleChanges[0], null, 2));
            }
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testmonitor();
