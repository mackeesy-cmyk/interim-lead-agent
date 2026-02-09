import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('finn_dump_L.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Found job-cards:', $('.job-card').length);

const first = $('.job-card').first();

console.log('--- Structure of First Card ---');
function dump(el: any, depth = 0) {
    const indent = '  '.repeat(depth);
    const tagName = el[0].tagName;
    const className = $(el).attr('class') || '';
    const text = $(el).clone().children().remove().end().text().trim();

    if (tagName) {
        console.log(`${indent}<${tagName} class="${className}"> ${text ? `"${text.slice(0, 30)}..."` : ''}`);
    }

    $(el).children().each((_, child) => dump($(child), depth + 1));
}

dump(first);
