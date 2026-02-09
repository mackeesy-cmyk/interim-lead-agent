/**
 * Test Script for RSS Feeds
 * Verifies that DN, E24, Finansavisen, and NTB feeds are working
 */

import { fetchDNRSS, fetchE24RSS, fetchFinansavisenRSS, fetchNTBRSS } from '../lib/rss';

async function main() {
    console.log('🚀 Testing RSS Feeds...\n');

    try {
        console.log('Fetching DN...');
        const dn = await fetchDNRSS();
        console.log(`✅ DN: ${dn.length} items`);
        if (dn.length > 0) console.log(`   - "${dn[0].title}"`);

        console.log('\nFetching E24...');
        const e24 = await fetchE24RSS();
        console.log(`✅ E24: ${e24.length} items`);
        if (e24.length > 0) console.log(`   - "${e24[0].title}"`);

        console.log('\nFetching Finansavisen...');
        const fa = await fetchFinansavisenRSS();
        console.log(`✅ Finansavisen: ${fa.length} items`);
        if (fa.length > 0) console.log(`   - "${fa[0].title}"`);

        console.log('\nFetching NTB...');
        const ntb = await fetchNTBRSS();
        console.log(`✅ NTB: ${ntb.length} items`);
        if (ntb.length > 0) console.log(`   - "${ntb[0].title}"`);

    } catch (error) {
        console.error('❌ RSS verification failed:', error);
    }
}

main();
