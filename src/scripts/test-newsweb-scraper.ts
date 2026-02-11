/**
 * Test the 2-stage NewsWeb scraper
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testNewsWebScraper() {
    const { scrapeNewsWebListing, deepScrapeNewsWebAnnouncements } = await import('../lib/newsweb');

    console.log('🧪 Testing NewsWeb 2-Stage Scraper\n');
    console.log('='.repeat(80));

    // Stage 1: Get all announcements
    console.log('\n📰 STAGE 1: Scraping listing page...\n');
    const result = await scrapeNewsWebListing();

    console.log(`\n📊 STAGE 1 RESULTS:`);
    console.log(`   Total announcements: ${result.announcements.length}`);
    console.log(`   Interesting: ${result.interesting.length}`);
    console.log(`   Credits used: ${result.creditsUsed}`);

    if (result.interesting.length > 0) {
        console.log(`\n✅ Interesting announcements:\n`);
        result.interesting.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.company_name}`);
            console.log(`      Title: ${a.title}`);
            console.log(`      Triggers: ${a.triggers?.join(', ') || 'N/A'}`);
            console.log(`      URL: ${a.url}`);
            console.log('');
        });

        // Stage 2: Deep scrape interesting ones
        console.log('='.repeat(80));
        console.log('\n🔥 STAGE 2: Deep scraping interesting announcements...\n');

        const fullContent = await deepScrapeNewsWebAnnouncements(result.interesting.slice(0, 3)); // Test with first 3

        console.log(`\n📊 STAGE 2 RESULTS:`);
        console.log(`   Scraped: ${fullContent.size}/${Math.min(3, result.interesting.length)}`);
        console.log(`   Credits used: ${fullContent.size}`);

        console.log(`\n📄 Sample content:\n`);
        Array.from(fullContent.entries()).slice(0, 1).forEach(([company, content]) => {
            console.log(`   Company: ${company}`);
            console.log(`   Content length: ${content.length} chars`);
            console.log(`   Preview:\n`);
            console.log(content.slice(0, 500));
            console.log('\n   ...\n');
        });
    }

    console.log('='.repeat(80));
    console.log(`\n✅ Test complete!`);
    console.log(`\nTotal credits: ${result.creditsUsed + (result.interesting.length > 0 ? 3 : 0)}`);
}

testNewsWebScraper().catch(console.error);
