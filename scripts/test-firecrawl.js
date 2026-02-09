
import { searchCorroboration } from '../src/lib/search';

async function test() {
    const query = 'Digi.no IT-sjef slutter';
    console.log(`Testing query: ${query}`);
    try {
        const results = await searchCorroboration('', query);
        console.log(`Found ${results.length} results`);
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.title} - ${r.url}`);
        });
    } catch (e) {
        console.error(`Search failed: ${e.message}`);
    }
}

test();
