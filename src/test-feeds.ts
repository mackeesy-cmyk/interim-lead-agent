import { fetchDNRSS, fetchE24RSS, fetchFinansavisenRSS, fetchNTBRSS } from './lib/rss';

async function testFeeds() {
    try {
        console.log('Testing DN RSS...');
        const dn = await fetchDNRSS();
        console.log(`DN returned ${dn.length} items`);

        console.log('\nTesting E24 RSS...');
        const e24 = await fetchE24RSS();
        console.log(`E24 returned ${e24.length} items`);

        console.log('\nTesting Finansavisen RSS...');
        const finans = await fetchFinansavisenRSS();
        console.log(`Finansavisen returned ${finans.length} items`);

        console.log('\nTesting NTB RSS...');
        const ntb = await fetchNTBRSS();
        console.log(`NTB returned ${ntb.length} items`);

    } catch (error: any) {
        console.error('Feed test failed:', error.message);
    }
}

testFeeds();
