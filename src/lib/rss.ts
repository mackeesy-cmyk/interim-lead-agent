/**
 * RSS Feed Parser for DN and other Norwegian news sources
 */

interface RSSItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    author?: string;
    category?: string;
}

interface ParsedFeed {
    items: RSSItem[];
    lastBuildDate?: string;
}

// Updated RSS feeds with user-verified sources
export async function fetchDNRSS(): Promise<RSSItem[]> {
    try {
        // DN with filtered categories: nyheter, etterbørs, gründer, børs, jobb_og_ledelse
        const response = await fetch('https://services.dn.no/api/feed/rss/?categories=nyheter,etterb%C3%B8rs,gr%C3%BCnder,b%C3%B8rs,jobb_og_ledelse&topics=');
        const xml = await response.text();
        return parseRSSXML(xml);
    } catch (error) {
        console.error('Error fetching DN RSS:', error);
        return [];
    }
}

export async function fetchE24RSS(): Promise<RSSItem[]> {
    try {
        const feeds = [
            'https://e24.no/rss2/',
            'https://e24.no/rss2/?seksjon=boers-og-finans',
            'https://e24.no/rss2/?seksjon=it'
        ];

        const allItems: RSSItem[] = [];
        for (const feedUrl of feeds) {
            const response = await fetch(feedUrl);
            const xml = await response.text();
            const items = parseRSSXML(xml);
            allItems.push(...items);
        }
        return allItems;
    } catch (error) {
        console.error('Error fetching E24 RSS:', error);
        return [];
    }
}

export async function fetchFinansavisenRSS(): Promise<RSSItem[]> {
    try {
        const feeds = [
            'https://ws.finansavisen.no/api/articles.rss?category=B%C3%B8rs',
            'https://ws.finansavisen.no/api/articles.rss'
        ];

        const allItems: RSSItem[] = [];
        for (const feedUrl of feeds) {
            const response = await fetch(feedUrl);
            const xml = await response.text();
            const items = parseRSSXML(xml);
            allItems.push(...items);
        }
        return allItems;
    } catch (error) {
        console.error('Error fetching Finansavisen RSS:', error);
        return [];
    }
}

export async function fetchNTBRSS(): Promise<RSSItem[]> {
    try {
        // NTB Press releases via X/Twitter (via rss.app)
        const response = await fetch('https://rss.app/feeds/MSIy5TCoyjpmiKyn.xml');
        const xml = await response.text();
        return parseRSSXML(xml);
    } catch (error) {
        console.error('Error fetching NTB RSS:', error);
        return [];
    }
}

export async function fetchRett24RSS(): Promise<RSSItem[]> {
    try {
        const response = await fetch('https://rett24.no/rss');
        const xml = await response.text();
        return parseRSSXML(xml);
    } catch (error) {
        console.error('Error fetching Rett24 RSS:', error);
        return [];
    }
}

export async function fetchDigiRSS(): Promise<RSSItem[]> {
    try {
        const response = await fetch('https://www.digi.no/rss');
        const xml = await response.text();
        return parseRSSXML(xml);
    } catch (error) {
        console.error('Error fetching Digi RSS:', error);
        return [];
    }
}

function parseRSSXML(xml: string): RSSItem[] {
    const items: RSSItem[] = [];

    // Simple regex-based parsing (works for most RSS feeds)
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
        const itemXml = match[1];

        const title = extractTag(itemXml, 'title');
        const link = extractTag(itemXml, 'link');
        const description = extractTag(itemXml, 'description');
        const pubDate = extractTag(itemXml, 'pubDate');
        const author = extractTag(itemXml, 'author');
        const category = extractTag(itemXml, 'category');

        if (title && link) {
            items.push({
                title: decodeHTMLEntities(title),
                link,
                description: decodeHTMLEntities(description || ''),
                pubDate: pubDate || new Date().toISOString(),
                author: author || undefined,
                category: category || undefined,
            });
        }
    }

    return items;
}

function extractTag(xml: string, tag: string): string | null {
    // Handle CDATA sections
    const cdataMatch = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
    if (cdataMatch) {
        return cdataMatch[1];
    }

    // Handle regular content
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return match ? match[1].trim() : null;
}

function decodeHTMLEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}

// Pre-filter for business-relevant keywords before sending to LLM
// Full pattern library from Pattern-bibliotek v1
const TRIGGER_KEYWORDS = [
    // 1. LeadershipChange (NO)
    'går av', 'trår av', 'fratrer', 'med umiddelbar virkning',
    'konstituert', 'midlertidig', 'styret takker', 'avslutter samarbeidet',
    'ny CEO søkes', 'ny CFO søkes', 'lederbytte', 'toppsjefbytte',
    'ny leder', 'ny sjef', 'nye ledere', 'daglig leder', 'lederskap',
    'toppledelse', 'lederskifte', 'lederendring', 'trer tilbake',
    'ansetter', 'utnevner', 'administrerende direktør', 'toppsjef',
    'CEO', 'CFO', 'COO', 'interim',
    // 1. LeadershipChange (EN)
    'steps down', 'resigns', 'effective immediately',
    'interim CEO', 'acting CFO', 'the board has decided',
    'search for a new CEO',
    // 2. Restructuring / Insolvency (NO)
    'konkurs', 'begjært konkurs', 'rekonstruksjon', 'rekonstruksjonsprosess',
    'alvorlige likviditetsutfordringer', 'going concern',
    'brudd på lånebetingelser', 'covenant-brudd', 'forhandlinger med kreditorer',
    'insolvens', 'kreditor', 'likviditet', 'omorganisering', 'restrukturering',
    'omstilling',
    // 2. Restructuring / Insolvency (EN)
    'restructuring', 'financial restructuring', 'filed for bankruptcy',
    'liquidity constraints', 'going concern uncertainty',
    'breach of covenants', 'creditor negotiations',
    // 3. Mergers & Acquisitions (NO)
    'har kjøpt', 'overtar', 'fusjoneres med', 'selger virksomheten',
    'utskillelse', 'carve-out', 'ny eier', 'kjøper', 'selger',
    'fusjon', 'oppkjøp', 'private equity', 'sammenslåing', 'slå seg sammen',
    // 3. Mergers & Acquisitions (EN)
    'acquires', 'has acquired', 'merger with', 'divestment',
    'private equity-backed',
    // 4. Strategic Review (NO)
    'strategisk gjennomgang', 'vurderer strategiske alternativer',
    'vurderer salg', 'ny strategisk retning',
    // 4. Strategic Review (EN)
    'strategic review', 'exploring strategic alternatives',
    'considering a sale', 'review of strategic options',
    // 5. Operational Crisis (NO)
    'tap av kontrakt', 'betydelige leveranseavvik', 'produksjonsstans',
    'driftsproblemer', 'alvorlig IT-hendelse', 'krise',
    // 5. Operational Crisis (EN)
    'loss of major contract', 'operational disruption',
    'production halt', 'system outage',
    // 6. Regulatory / Legal (NO)
    'tilsynssak', 'pålegg fra myndighetene', 'bøter', 'sanksjoner',
    'alvorlige avvik', 'rettssak',
    // 6. Regulatory / Legal (EN)
    'regulatory investigation', 'enforcement action',
    'fines and penalties', 'material legal risk',
    // 7. Cost Program / Downsizing (NO)
    'nedbemanning', 'permitteringer', 'kostnadsprogram',
    'effektiviseringstiltak', 'reduserer kapasitet',
    'kostnadskutt', 'effektivisering', 'kutter',
    // 7. Cost Program / Downsizing (EN)
    'cost reduction program', 'downsizing', 'workforce reduction',
    'efficiency measures',
    // 8. Hiring Signal CxO (NO)
    'søker CEO', 'søker CFO', 'søker COO',
    'snarest mulig tiltredelse', 'midlertidig stilling',
    'konfidensiell prosess',
    // 8. Hiring Signal CxO (EN)
    'seeking a CFO', 'seeking a CEO', 'interim position',
    'confidential search', 'immediate start',
    // 9. Ownership / Governance / IPO (NO)
    'ny hovedeier', 'styreleder byttes', 'endringer i styret',
    'aktiv eier', 'børsnotering', 'IPO', 'planlegger notering',
    'notering på Oslo Børs',
    // 9. Ownership / Governance / IPO (EN)
    'change of ownership', 'new majority shareholder', 'board reshuffle',
    'activist investor', 'initial public offering', 'IPO process',
    'planned listing', 'preparing for listing',
    // 10. Transformation Program (NO)
    'større endringsprogram', 'ERP-implementering',
    'organisasjonsendring', 'digital transformasjon',
    // 10. Transformation Program (EN)
    'transformation program', 'ERP implementation',
    'organizational change', 'digital transformation',
];

export function preFilterItems(items: RSSItem[]): RSSItem[] {
    return items.filter((item) => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        return TRIGGER_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
    });
}
