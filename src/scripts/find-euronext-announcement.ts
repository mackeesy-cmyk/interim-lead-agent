/**
 * Find a specific company's announcement on Euronext and scrape it
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { fetchEuronextAnnouncements } from '../lib/euronext';

async function findEuronextAnnouncement(searchTerm: string) {
    console.log(`🔍 Searching Euronext for: ${searchTerm}\n`);

    const announcements = await fetchEuronextAnnouncements();

    const matches = announcements.filter(a =>
        a.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log(`📊 Found ${matches.length} matching announcements:\n`);

    matches.forEach((a, i) => {
        console.log(`${i + 1}. ${a.company_name}`);
        console.log(`   Title: ${a.title}`);
        console.log(`   Industry: ${a.industry}`);
        console.log(`   Topic: ${a.topic}`);
        console.log(`   URL: ${a.url}`);
        console.log('');
    });

    if (matches.length > 0) {
        console.log('💡 Use this URL to scrape the full article for enrichment');
    }
}

const searchTerm = process.argv[2] || 'Veidekke';
findEuronextAnnouncement(searchTerm).catch(console.error);
