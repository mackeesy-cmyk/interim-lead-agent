
import dotenv from 'dotenv';
import path from 'path';
import { verifyByOrgNumber, CachedBrregLookup } from '@/lib/bronnysund';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function testBrreg() {
    const orgNr = '933739888'; // Schibsted ASA
    console.log(`Testing lookup for ${orgNr}...`);

    try {
        const lookup = new CachedBrregLookup();
        const results = await lookup.batchLookup([orgNr]);
        const company = results.get(orgNr);

        console.log('Result:', company);

        if (company) {
            console.log('Verification:', CachedBrregLookup.verify(company));
        } else {
            console.error('Company not found in lookup result.');
        }

        // Test legacy wrapper
        console.log('Legacy verifyByOrgNumber:');
        const legacy = await verifyByOrgNumber(orgNr);
        console.log(legacy);

    } catch (e) {
        console.error('Exception:', e);
    }
}

testBrreg();
