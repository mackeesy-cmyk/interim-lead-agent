/**
 * NewsWeb/Euronext 2-Stage Intelligent Scraper
 *
 * Stage 1: Scrape listing page with Cheerio (FREE) → get ~50 announcements
 * Stage 2: Scrape only interesting announcement URLs (5-10 credits) → get full content
 */

import { scrapeUrl } from './firecrawl';
import { detectTriggers } from './gemini';
import { fetchEuronextAnnouncements } from './euronext';

export interface NewsWebAnnouncement {
    company_name: string;
    title: string;
    url: string;
    date?: string;
    isInteresting?: boolean;
    triggers?: string[];
}

export interface NewsWebResult {
    announcements: NewsWebAnnouncement[];
    interesting: NewsWebAnnouncement[];
    creditsUsed: number;
}

/**
 * Stage 1: Scrape NewsWeb listing page using Cheerio (FREE, server-rendered)
 */
export async function scrapeNewsWebListing(): Promise<NewsWebResult> {
    console.log('📰 Stage 1: Scraping NewsWeb listing page (Cheerio)...');

    // Use Cheerio-based Euronext scraper (free, gets ~50 announcements)
    const euronextAnnouncements = await fetchEuronextAnnouncements();

    const announcements: NewsWebAnnouncement[] = euronextAnnouncements.map(a => ({
        company_name: a.company_name,
        title: a.title,
        url: a.url,
    }));

    console.log(`✅ Parsed ${announcements.length} announcements (Cheerio/free)`);

    if (announcements.length === 0) {
        return { announcements: [], interesting: [], creditsUsed: 0 }; // Free!
    }

    // Stage 1.5: Ask Gemini which announcements are interesting
    console.log('🤖 Analyzing which announcements are interesting...');

    const announcementText = announcements
        .map((a, i) => `${i + 1}. ${a.company_name}: ${a.title}`)
        .join('\n');

    const triggerResult = await detectTriggers(
        announcementText,
        'stock_exchange_announcement',
        'Euronext Oslo Børs'
    );

    // Mark interesting announcements
    const interesting: NewsWebAnnouncement[] = [];

    if (!triggerResult.no_trigger_found && triggerResult.triggers_found.length > 0) {
        // Match triggers back to announcements
        triggerResult.triggers_found.forEach(trigger => {
            const excerpt = trigger.excerpt || '';
            const matchingAnnouncement = announcements.find(a =>
                excerpt.toLowerCase().includes(a.company_name.toLowerCase()) ||
                excerpt.toLowerCase().includes(a.title.toLowerCase())
            );

            if (matchingAnnouncement) {
                matchingAnnouncement.isInteresting = true;
                matchingAnnouncement.triggers = [trigger.category];
                interesting.push(matchingAnnouncement);
            }
        });
    }

    console.log(`✅ Found ${interesting.length} interesting announcements (will deep scrape these)`);

    return {
        announcements,
        interesting,
        creditsUsed: 0, // Stage 1 is free (Cheerio)
    };
}

/**
 * Stage 2: Deep scrape individual announcement URLs for interesting leads
 */
export async function deepScrapeNewsWebAnnouncements(
    announcements: NewsWebAnnouncement[]
): Promise<Map<string, string>> {
    const results = new Map<string, string>(); // company_name -> full_content

    console.log(`\n🔥 Stage 2: Deep scraping ${announcements.length} interesting announcements...`);

    for (const announcement of announcements) {
        console.log(`   Scraping: ${announcement.company_name} - ${announcement.title}`);

        const scrapeResult = await scrapeUrl(announcement.url);

        if (!scrapeResult.success || !scrapeResult.content) {
            console.warn(`   ⚠️  Failed: ${scrapeResult.error}`);
            continue;
        }

        // Clean the content (remove navigation, extract press release)
        const cleanContent = cleanPressReleaseContent(scrapeResult.content);
        results.set(announcement.company_name, cleanContent);

        console.log(`   ✅ Got ${cleanContent.length} chars of clean content`);
    }

    console.log(`✅ Deep scrape complete: ${results.size}/${announcements.length} successful\n`);

    return results;
}

/**
 * Parse NewsWeb listing markdown to extract announcements
 */
function parseNewsWebListingMarkdown(markdown: string): NewsWebAnnouncement[] {
    const announcements: NewsWebAnnouncement[] = [];
    const lines = markdown.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for patterns like: [COMPANY_NAME](url) followed by title
        // or table rows with company + title + link
        const linkMatch = line.match(/\[([^\]]+)\]\((https:\/\/live\.euronext\.com\/[^\)]+)\)/);

        if (linkMatch && linkMatch[1].length > 2) {
            const text = linkMatch[1];
            const url = linkMatch[2];

            // Try to parse company name and title
            // Sometimes it's "Company: Title", sometimes just company or title
            let company_name = '';
            let title = '';

            if (text.includes(':')) {
                const parts = text.split(':');
                company_name = parts[0].trim();
                title = parts.slice(1).join(':').trim();
            } else {
                // Look ahead for more context
                const nextLine = lines[i + 1]?.trim() || '';
                if (nextLine && !nextLine.startsWith('[') && nextLine.length > 10) {
                    company_name = text;
                    title = nextLine;
                } else {
                    title = text;
                    company_name = 'Unknown';
                }
            }

            if (url.includes('/node/')) {
                announcements.push({
                    company_name,
                    title: title || text,
                    url,
                });
            }
        }
    }

    return announcements;
}

/**
 * Clean press release content from Firecrawl markdown
 * Removes navigation, boilerplate, keeps actual press release text
 */
export function cleanPressReleaseContent(markdown: string): string {
    const paragraphs = markdown
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => {
            if (p.length < 50) return false;
            if (p.includes('Open submenu')) return false;
            if (p.includes('Close submenu')) return false;
            if (p.match(/^\[.*\]\(.*\)$/)) return false; // Pure link lines
            if (p.startsWith('- [') && p.includes('](')) return false; // Navigation lists
            if (p.startsWith('Menu')) return false;
            return true;
        });

    return paragraphs.join('\n\n');
}
