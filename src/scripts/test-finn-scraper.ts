/**
 * Test Script for FINN Scraper (Cheerio Optimization)
 * Verifies that fetchFinnJobs correctly scrapes job listings without Firecrawl
 */

import { fetchFinnJobs } from '../lib/finn';

async function main() {
    console.log('🚀 Starting FINN Scraper Test (Cheerio)...');

    try {
        const jobs = await fetchFinnJobs();

        console.log('\n✅ Scraper finished!');
        console.log(`Found ${jobs.length} total listings.`);

        if (jobs.length > 0) {
            console.log('\n--- First 5 Listings ---');
            jobs.slice(0, 5).forEach((job, i) => {
                console.log(`[${i + 1}] ${job.role}`);
                console.log(`    Company: ${job.company_name}`);
                console.log(`    URL: ${job.url}`);
                if (job.urgency_signals.length > 0) {
                    console.log(`    ⚠️ Signals: ${job.urgency_signals.join(', ')}`);
                }
                console.log('');
            });
        } else {
            console.warn('⚠️ No listings found. Check selectors?');
        }

    } catch (error) {
        console.error('❌ Scraper failed:', error);
    }
}

main();
