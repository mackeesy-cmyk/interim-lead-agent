/**
 * Debug NewsWeb markdown structure
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import fs from 'fs';

async function debugNewsWebMarkdown() {
    const { scrapeUrl } = await import('../lib/firecrawl');

    console.log('🔍 Scraping NewsWeb to inspect markdown structure...\n');

    const result = await scrapeUrl('https://live.euronext.com/en/markets/oslo/equities/company-news');

    if (!result.success || !result.content) {
        console.log('❌ Failed');
        return;
    }

    // Save to file
    const outputPath = path.join(process.cwd(), 'debug-newsweb.md');
    fs.writeFileSync(outputPath, result.content);

    console.log(`✅ Saved ${result.content.length} chars to: ${outputPath}\n`);

    // Show first 50 lines that might contain announcements
    const lines = result.content.split('\n');

    console.log('📄 Lines containing "VEIDEKKE", company names, or node URLs:\n');
    lines.forEach((line, i) => {
        if (
            line.toUpperCase().includes('VEIDEKKE') ||
            line.toUpperCase().includes('ELKEM') ||
            line.includes('/node/') ||
            (line.includes('http') && line.length < 200)
        ) {
            console.log(`Line ${i}: ${line}`);
        }
    });
}

debugNewsWebMarkdown().catch(console.error);
