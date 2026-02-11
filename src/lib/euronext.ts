/**
 * Euronext Oslo Børs Company News Scraper
 * Uses Cheerio (free) instead of Firecrawl to scrape stock exchange announcements.
 * Source: live.euronext.com — server-rendered HTML, no JS required.
 */

import * as cheerio from 'cheerio';

const EURONEXT_NEWS_URL = 'https://live.euronext.com/en/markets/oslo/equities/company-news';

export interface EuronextAnnouncement {
    company_name: string;
    title: string;
    industry: string;
    topic: string;
    node_id: string; // Euronext internal ID
    url: string; // Full announcement URL
}

/**
 * Fetches today's company announcements from Euronext Oslo Børs.
 * Free — uses native fetch + Cheerio, no Firecrawl credits.
 */
export async function fetchEuronextAnnouncements(): Promise<EuronextAnnouncement[]> {
    try {
        const response = await fetch(EURONEXT_NEWS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; InterimLeadAgent/1.0)',
            },
        });

        if (!response.ok) {
            console.error(`Euronext fetch failed: ${response.status}`);
            return [];
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const announcements: EuronextAnnouncement[] = [];

        // Parse the HTML table rows
        $('tbody tr').each((_, row) => {
            const $row = $(row);

            const company = $row.find('td.views-field-field-company-name').text().trim();
            const titleEl = $row.find('td.views-field-title a');
            const title = titleEl.text().trim();
            const nodeId = titleEl.attr('data-node-nid') || '';
            const industry = $row.find('td.views-field-field-icb').text().trim();
            const topic = $row.find('td.views-field-field-company-press-releases').text().trim();

            if (company && title && nodeId) {
                announcements.push({
                    company_name: company,
                    title,
                    industry,
                    topic,
                    node_id: nodeId,
                    url: `https://live.euronext.com/en/node/${nodeId}`,
                });
            }
        });

        console.log(`📊 Euronext: parsed ${announcements.length} announcements`);
        return announcements;
    } catch (error) {
        console.error('Euronext scraping failed:', error);
        return [];
    }
}
