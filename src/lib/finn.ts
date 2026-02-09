/**
 * FINN.no Job Listing Scraper
 * Scrapes CxO job listings from FINN.no as hiring signals for ESL+
 * 
 * Optimized (Feb 9): Uses Cheerio + Fetch (Free) instead of Firecrawl + Gemini (Paid)
 */

import * as cheerio from 'cheerio';

// FINN search URLs: CxO roles filtered to Østlandet
// Tightened queries - removed broad "interim" and less relevant CTO/COO
export const FINN_SEARCH_URLS = [
    'https://www.finn.no/job/search?location=1.20001.20061&location=1.20001.20007&location=1.20001.20003&location=1.20001.20008&location=1.20001.20002&location=1.20001.20009&q=ceo',
    'https://www.finn.no/job/search?location=1.20001.20061&location=1.20001.20007&location=1.20001.20003&location=1.20001.20008&location=1.20001.20002&location=1.20001.20009&q=cfo',
    'https://www.finn.no/job/search?location=1.20001.20061&location=1.20001.20007&location=1.20001.20003&location=1.20001.20008&location=1.20001.20002&location=1.20001.20009&q=administrerende+direkt%C3%B8r',
];

export interface FinnJobSeed {
    company_name: string;
    role: string;
    urgency_signals: string[];
    url: string;
    search_query: string;
}

/**
 * Scrape all FINN search URLs using Cheerio (Fast & Free).
 * Returns deduplicated list of job seeds.
 */
export async function fetchFinnJobs(): Promise<FinnJobSeed[]> {
    const allJobs: FinnJobSeed[] = [];
    const seenCompanies = new Set<string>();

    for (const searchUrl of FINN_SEARCH_URLS) {
        try {
            // Extract search query from URL for context
            const urlObj = new URL(searchUrl);
            const query = urlObj.searchParams.get('q') || 'unknown';

            console.log(`📋 Scraping FINN for "${query}" (Cheerio)...`);

            // Use fetch with headers to look like a browser
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                },
                redirect: 'follow',
            });

            if (!response.ok) {
                console.warn(`⚠️ FINN fetch failed for "${query}": ${response.status}`);
                continue;
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const jobs: FinnJobSeed[] = [];

            // Selector based on inspection (Feb 9)
            // .job-card -> contains article
            $('.job-card').each((_, el) => {
                const linkEl = $(el).find('a.job-card-link');
                const title = linkEl.text().replace(/\s+/g, ' ').trim();
                const relativeUrl = linkEl.attr('href');
                let url = '';
                if (relativeUrl) {
                    url = relativeUrl.startsWith('http')
                        ? relativeUrl
                        : `https://www.finn.no${relativeUrl}`;
                }

                // Company is often in .text-caption strong, but structure varies
                // Fallback to searching text nodes if specific selector fails
                let company = $(el).find('.text-caption strong').text().trim();

                // Urgency signals (badges)
                const urgencySignals: string[] = [];
                // Look for urgency key words in the card text, as specific badges change classes often
                const cardText = $(el).text().toLowerCase();
                if (cardText.includes('snarlig') || cardText.includes('umiddelbar')) urgencySignals.push('Haster');
                if (cardText.includes('interim')) urgencySignals.push('Interim');
                if (cardText.includes('management for hire')) urgencySignals.push('Interim');

                if (title && company && url) {
                    // Filter 1: Must have leadership keywords in title
                    const titleLower = title.toLowerCase();
                    const leadershipKeywords = [
                        'ceo', 'cfo', 'cto', 'coo',
                        'direktør', 'leder', 'sjef', 'chief', 'director',
                        'interim', 'daglig leder', 'adm. dir', 'administrerende',
                        'økonomidirektør', 'finansdirektør', 'it-direktør'
                    ];
                    const hasLeadershipRole = leadershipKeywords.some(kw => titleLower.includes(kw));

                    // Filter 2: Exclude non-leadership roles
                    const excludeKeywords = [
                        'developer', 'utvikler', 'engineer', 'ingeniør',
                        'analyst', 'analytiker', 'koordinator', 'coordinator',
                        'assistant', 'assistent', 'konsulent', 'consultant',
                        'adviser', 'rådgiver', 'specialist', 'spesialist',
                        'tekniker', 'technician', 'designer'
                    ];
                    const isExcluded = excludeKeywords.some(kw => titleLower.includes(kw));

                    // Only add if it's a leadership role and not excluded
                    if (hasLeadershipRole && !isExcluded) {
                        jobs.push({
                            company_name: company,
                            role: title,
                            url,
                            search_query: query,
                            urgency_signals: [...new Set(urgencySignals)],
                        });
                    }
                }
            });

            for (const job of jobs) {
                // Deduplicate by company name (case-insensitive)
                const key = job.company_name.toLowerCase().trim();
                if (seenCompanies.has(key)) continue;
                seenCompanies.add(key);

                allJobs.push(job);
            }

            console.log(`  → Found ${jobs.length} listings for "${query}"`);
        } catch (error) {
            console.error(`FINN scrape error for URL: ${error}`);
        }
    }

    console.log(`📋 FINN total: ${allJobs.length} unique job seeds`);
    return allJobs;
}
