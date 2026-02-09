import FirecrawlApp from '@mendable/firecrawl-js';

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export interface SearchResult {
    title: string;
    url: string;
    description: string;
    content?: string;
}

/**
 * Perform a targeted search for a company and trigger
 * Used in Stage 2 of ESL+ to find corroborating evidence.
 */
export async function searchCorroboration(
    companyName: string,
    trigger: string
): Promise<SearchResult[]> {
    const query = `"${companyName}" ${trigger} pressemelding nyheter`;

    try {
        // NB: Ikke bruk scrapeOptions! Det koster ~150 credits per side.
        // Bare metadata (tittel/URL/beskrivelse) er nok for å vurdere relevans.
        const searchResponse = await app.search(query, {
            limit: 3
        }) as any;

        if (searchResponse.success === false) {
            console.error('Firecrawl search failed:', searchResponse.error);
            return [];
        }

        const data = searchResponse.data || searchResponse;
        return (Array.isArray(data) ? data : []).map((item: any) => ({
            title: item.title || '',
            url: item.url || '',
            description: item.description || '',
            content: item.markdown || item.content || ''
        }));
    } catch (error) {
        console.error('Search corroboration error:', error);
        return [];
    }
}
