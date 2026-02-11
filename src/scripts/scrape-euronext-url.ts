/**
 * Scrape a specific Euronext announcement URL
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function scrapeEuronextUrl(url: string) {
    console.log(`🔥 Scraping Euronext announcement: ${url}\n`);

    const { scrapeUrl } = await import('../lib/firecrawl');
    const result = await scrapeUrl(url);

    if (!result.success || !result.content) {
        console.log(`❌ Scrape failed: ${result.error}`);
        return;
    }

    console.log(`✅ Scraped ${result.content.length} chars\n`);

    // Try to find the main article content (usually starts after navigation)
    const lines = result.content.split('\n');
    const contentStart = lines.findIndex(line =>
        line.toLowerCase().includes('veidekke') &&
        line.length > 50 &&
        !line.includes('Menu') &&
        !line.includes('Open submenu')
    );

    const relevantContent = contentStart > 0
        ? lines.slice(contentStart, contentStart + 50).join('\n')
        : result.content.slice(0, 2000);

    console.log('📄 Article Content:\n');
    console.log(relevantContent);
    console.log('\n...\n');
}

const url = process.argv[2];

if (!url) {
    console.log('Usage: npx tsx src/scripts/scrape-euronext-url.ts <URL>');
    process.exit(1);
}

scrapeEuronextUrl(url).catch(console.error);
