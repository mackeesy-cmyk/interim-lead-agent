/**
 * Extract press release content from Euronext/NewsWeb scrape
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function extractPressRelease(url: string) {
    const { scrapeUrl } = await import('../lib/firecrawl');

    console.log(`🔥 Scraping: ${url}\n`);
    const result = await scrapeUrl(url);

    if (!result.success || !result.content) {
        console.log(`❌ Failed: ${result.error}`);
        return;
    }

    const content = result.content;
    console.log(`✅ Got ${content.length} chars\n`);

    // Split into paragraphs and filter out navigation/boilerplate
    const paragraphs = content.split('\n\n').map(p => p.trim()).filter(p => {
        if (p.length < 50) return false; // Too short
        if (p.includes('Open submenu')) return false;
        if (p.includes('Close submenu')) return false;
        if (p.includes('[') && p.includes('](')) return false; // Markdown links
        if (p.startsWith('-')) return false; // List items
        if (p.match(/^\d+\s/)) return false; // Numbered lists
        return true;
    });

    console.log('📄 EXTRACTED PRESS RELEASE CONTENT:\n');
    console.log('='.repeat(80));

    // Take first 10 meaningful paragraphs
    paragraphs.slice(0, 10).forEach((p, i) => {
        console.log(`\n[Para ${i + 1}]`);
        console.log(p);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal paragraphs: ${paragraphs.length}`);
}

const url = process.argv[2];
if (!url) {
    console.log('Usage: npx tsx extract-press-release.ts <URL>');
    process.exit(1);
}

extractPressRelease(url).catch(console.error);
