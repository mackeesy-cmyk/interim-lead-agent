/**
 * Brønnøysund Registry API Client
 * Free API for Norwegian company data
 * Optimalisert med intelligent caching for å minimere API-kall
 */

const BASE_URL = 'https://data.brreg.no/enhetsregisteret/api';

// Østlandet municipalities (Oslo, Viken, Innlandet regions)
const OSTLANDET_KOMMUNER = [
    // Oslo
    'OSLO',
    // Viken (former Akershus, Buskerud, Østfold)
    'BÆRUM', 'ASKER', 'LILLESTRØM', 'NORDRE FOLLO', 'LØRENSKOG', 'RÆLINGEN',
    'ULLENSAKER', 'NESODDEN', 'FROGN', 'VESTBY', 'ÅS', 'ENEBAKK', 'AURSKOG-HØLAND',
    'EIDSVOLL', 'NANNESTAD', 'GJERDRUM', 'NES', 'NITTEDAL', 'LUNNER', 'JEVNAKER',
    'DRAMMEN', 'KONGSBERG', 'RINGERIKE', 'HOLE', 'LIER', 'ØVRE EIKER', 'MODUM',
    'KRØDSHERAD', 'FLÆ', 'NESBYEN', 'GOL', 'HEMSEDAL', 'ÅL', 'HOL', 'SIGDAL',
    'FLESBERG', 'ROLLAG', 'NORE OG UVDAL',
    'HALDEN', 'MOSS', 'SARPSBORG', 'FREDRIKSTAD', 'HVALER', 'RÅDE', 'VÅLER',
    'SKIPTVET', 'INDRE ØSTFOLD', 'RAKKESTAD', 'MARKER', 'AREMARK',
    // Innlandet (former Hedmark, Oppland)
    'HAMAR', 'KONGSVINGER', 'RINGSAKER', 'LØTEN', 'STANGE', 'NORD-ODAL', 'SØR-ODAL',
    'EIDSKOG', 'GRUE', 'ÅSNES', 'VÅLER', 'ELVERUM', 'TRYSIL', 'ÅMOT', 'STOR-ELVDAL',
    'RENDALEN', 'ENGERDAL', 'TOLGA', 'TYNSET', 'ALVDAL', 'FOLLDAL', 'OS',
    'LILLEHAMMER', 'GJØVIK', 'DOVRE', 'LESJA', 'SKJÅK', 'LOM', 'VÅGÅ', 'NORD-FRON',
    'SEL', 'SØR-FRON', 'RINGEBU', 'ØYER', 'GAUSDAL', 'ØSTRE TOTEN', 'VESTRE TOTEN',
    'JEVNAKER', 'LUNNER', 'GRAN', 'SØNDRE LAND', 'NORDRE LAND', 'SØR-AURDAL',
    'ETNEDAL', 'NORD-AURDAL', 'VESTRE SLIDRE', 'ØYSTRE SLIDRE', 'VANG',
    // Vestfold og Telemark (eastern parts)
    'TØNSBERG', 'SANDEFJORD', 'LARVIK', 'HORTEN', 'HOLMESTRAND', 'FÆRDER',
    'PORSGRUNN', 'SKIEN', 'NOTODDEN', 'SILJAN', 'BAMBLE', 'KRAGERØ', 'DRANGEDAL',
    'NOME', 'MIDT-TELEMARK', 'TINN', 'HJARTDAL', 'SELJORD', 'KVITESEID', 'NISSEDAL',
    'FYRESDAL', 'TOKKE', 'VINJE',
];

export interface BrregCompany {
    organisasjonsnummer: string;
    navn: string;
    organisasjonsform: {
        kode: string;
        beskrivelse: string;
    };
    forretningsadresse?: {
        kommune: string;
        postnummer: string;
        poststed: string;
        adresse: string[];
    };
    antallAnsatte?: number;
    konkurs: boolean;
    konkursdato?: string;
    underAvvikling: boolean;
    underTvangsavviklingEllerTvangsopplosning: boolean;
    naeringskode1?: {
        kode: string;
        beskrivelse: string;
    };
    stiftelsesdato?: string;
    hjemmeside?: string;
}

// In-memory cache med TTL
const cache = new Map<string, { data: BrregCompany | null; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 timer

// Minimum employees for status updates (avvikling/konkurs) to be worth processing
// 0-employee companies under avvikling are typically dormant shell companies
const MIN_EMPLOYEES_FOR_STATUS_UPDATE = 1;

/**
 * Cached Brønnøysund lookup klasse
 * Tracker API-kall for monitoring
 */
export class CachedBrregLookup {
    private apiCallCount = 0;

    /**
     * Batch lookup - henter flere selskaper effektivt
     * Bruker cache for å unngå duplikate kall
     */
    async batchLookup(orgNumbers: string[]): Promise<Map<string, BrregCompany | null>> {
        const results = new Map<string, BrregCompany | null>();
        const toFetch: string[] = [];

        // Sjekk cache først
        for (const orgNr of orgNumbers) {
            const normalized = orgNr.replace(/\s/g, '');
            const cached = cache.get(normalized);

            if (cached && cached.expires > Date.now()) {
                results.set(normalized, cached.data);
            } else {
                toFetch.push(normalized);
            }
        }

        console.log(`📊 Brønnøysund: ${orgNumbers.length - toFetch.length} cached, ${toFetch.length} to fetch`);

        // Hent manglende data (parallelt med rate limiting)
        if (toFetch.length > 0) {
            const fetched = await this.fetchMultiple(toFetch);
            for (const [orgNr, data] of fetched) {
                results.set(orgNr, data);
                cache.set(orgNr, { data, expires: Date.now() + CACHE_TTL });
            }
        }

        return results;
    }

    /**
     * Hent flere selskaper parallelt med rate limiting
     */
    private async fetchMultiple(orgNumbers: string[]): Promise<Map<string, BrregCompany | null>> {
        const results = new Map<string, BrregCompany | null>();

        // Brønnøysund har ikke bulk API, så vi må hente én og én
        const CONCURRENCY = 5;

        for (let i = 0; i < orgNumbers.length; i += CONCURRENCY) {
            const batch = orgNumbers.slice(i, i + CONCURRENCY);
            const promises = batch.map(async (orgNr) => {
                const data = await this.fetchSingle(orgNr);
                return { orgNr, data };
            });

            const batchResults = await Promise.allSettled(promises);
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.set(result.value.orgNr, result.value.data);
                }
            }

            // Liten pause mellom batches
            if (i + CONCURRENCY < orgNumbers.length) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        return results;
    }

    /**
     * Hent enkelt selskap fra Brønnøysund
     */
    private async fetchSingle(orgNumber: string): Promise<BrregCompany | null> {
        this.apiCallCount++;
        const cleanOrg = orgNumber.replace(/\s/g, '');

        try {
            const headers = {
                'User-Agent': 'InterimLeadAgent/1.0 (https://incepto.no)',
                'Accept': 'application/json'
            };

            // 1. Try Main Entity (Direct Lookup)
            const url = `${BASE_URL}/enheter/${cleanOrg}`;
            // console.log(`Fetching from Brreg: ${url}`);
            const response = await fetch(url, { headers });

            if (response.ok) {
                return await response.json();
            } else if (response.status !== 404) {
                console.warn(`Brønnøysund API error for ${cleanOrg}: ${response.status}`);
            }

            // 2. Try Sub-entity (Direct Lookup)
            const subUrl = `${BASE_URL}/underenheter/${cleanOrg}`;
            const subResponse = await fetch(subUrl, { headers });

            if (subResponse.ok) {
                return await subResponse.json();
            }

            return null;
        } catch (error) {
            console.error(`Failed to fetch ${cleanOrg}:`, error);
            return null;
        }
    }

    /**
     * Search for a company by name in Brreg when org number is missing.
     * Returns the best match (first active result) or null.
     */
    async searchByName(companyName: string): Promise<BrregCompany | null> {
        // Check name cache first
        const cacheKey = `name:${companyName.toLowerCase()}`;
        const cached = cache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        this.apiCallCount++;
        try {
            const encoded = encodeURIComponent(companyName);
            const url = `${BASE_URL}/enheter?navn=${encoded}&size=5`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'InterimLeadAgent/1.0 (https://incepto.no)',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) return null;

            const data = await response.json();
            const enheter: BrregCompany[] = data._embedded?.enheter || [];

            // Return first active match (not under avvikling/tvangsoppløsning)
            const match = enheter.find(e =>
                !e.underAvvikling && !e.underTvangsavviklingEllerTvangsopplosning
            ) || enheter[0] || null;

            cache.set(cacheKey, { data: match, expires: Date.now() + CACHE_TTL });

            if (match) {
                // Also cache by org number for future lookups
                cache.set(match.organisasjonsnummer, { data: match, expires: Date.now() + CACHE_TTL });
            }

            return match;
        } catch (error) {
            console.error(`Brreg name search failed for "${companyName}":`, error);
            return null;
        }
    }

    getApiCallCount(): number {
        return this.apiCallCount;
    }

    /**
     * Verifiserer om et selskap er kvalifisert basert på lokasjon og drift
     */
    static verify(company: BrregCompany | null): {
        V: number;
        is_ostlandet: boolean;
        has_operations: boolean;
        hard_stop: boolean;
        reasoning: string
    } {
        if (!company) {
            return { V: 0, is_ostlandet: false, has_operations: false, hard_stop: true, reasoning: 'Company not found' };
        }

        const postnr = company.forretningsadresse?.postnummer?.substring(0, 2) || '';
        const is_ostlandet = [
            '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
            '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
            '20', '21', '22', '23', '24', '25', '30', '31', '32', '33',
            '34', '35', '36', '37', '38', '39'
        ].includes(postnr);

        // Operativ drift: Ansatte > 0 ELLER nylig stiftet ELLER spesifikke koder
        // Vi ekskluderer selskaper under avvikling eller konkurs (med mindre det er triggeren)
        const has_ansatte = (company.antallAnsatte || 0) > 0;
        const is_active = !company.underAvvikling && !company.underTvangsavviklingEllerTvangsopplosning;

        // Sjekk om det er et holdingselskap uten ansatte (ofte mindre relevante for interim)
        const is_holding = company.naeringskode1?.kode === '64.200';
        const has_operations = (has_ansatte || !is_holding) && is_active;

        // Addendum §2 veto rules: only entity-not-found or not-Østlandet
        // has_operations is tracked but NOT a veto
        const hard_stop = !company || !is_ostlandet;

        let reasoning = 'Verifisert';
        if (!is_ostlandet) reasoning = `Utenfor Østlandet (Postnr: ${postnr})`;
        else if (!has_operations) reasoning = 'Lav driftsaktivitet (ikke veto)';

        return {
            V: is_ostlandet ? 1 : 0,
            is_ostlandet,
            has_operations,
            hard_stop,
            reasoning
        };
    }
}

/**
 * Enkel lookup (bakoverkompatibel)
 */
export async function verifyByOrgNumber(orgNumber: string): Promise<any> {
    const lookup = new CachedBrregLookup();
    const results = await lookup.batchLookup([orgNumber]);
    const company = results.get(orgNumber.replace(/\s/g, '')) || null;

    const verification = CachedBrregLookup.verify(company);

    return {
        ...verification,
        hard_stop_triggered: verification.hard_stop,
        navn: company?.navn || 'Unknown'
    };
}

/**
 * Søk etter konkurser hos Brønnøysund (siste n dager)
 */
export async function searchBankruptcies(days: number = 7): Promise<BrregCompany[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const dateStr = fromDate.toISOString().split('T')[0];

    try {
        const response = await fetch(`${BASE_URL}/enheter?konkurs=true&fraStiftelsesdato=${dateStr}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data._embedded?.enheter || [];
    } catch (error) {
        console.error('Failed to search bankruptcies:', error);
        return [];
    }
}

/**
 * Hent kunngjøringer fra Brønnøysundregistrene (w2.brreg.no)
 * Scraper søkesiden for gjeldsforhandling, tvangsoppløsning, fusjon, fisjon, oppløsning
 */
export async function fetchKunngjoringer(days: number = 7): Promise<BrregKunngjoringResult[]> {
    const { scrapeUrl } = await import('./firecrawl');
    const { parseBrregKunngjoringer } = await import('./gemini');

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const formatDate = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    };

    // w2.brreg.no søke-URL med relevante kunngjøringstyper
    const searchUrl = `https://w2.brreg.no/kunngjoring/kombisok.jsp?datefrom=${formatDate(fromDate)}&dateto=${formatDate(toDate)}&teleession=false&teleession2=true`;

    console.log(`📜 Scraping Brreg kunngjøringer (${formatDate(fromDate)} - ${formatDate(toDate)})...`);

    try {
        const scrapeResult = await scrapeUrl(searchUrl);
        if (!scrapeResult.success || !scrapeResult.content) {
            console.warn(`⚠️ Brreg kunngjøringer scrape failed: ${scrapeResult.error}`);
            return [];
        }

        const announcements = await parseBrregKunngjoringer(scrapeResult.content);
        console.log(`  → Found ${announcements.length} announcements`);

        return announcements.map(a => ({
            company_name: a.company_name,
            org_number: a.org_number,
            announcement_type: a.announcement_type,
            trigger_category: a.trigger_category,
            excerpt: a.excerpt,
        }));
    } catch (error) {
        console.error('Brreg kunngjøringer fetch error:', error);
        return [];
    }
}

export interface BrregKunngjoringResult {
    company_name: string;
    org_number: string;
    announcement_type: string;
    trigger_category: string;
    excerpt: string;
}

/**
 * Enkel verifisering (Legacy support)
 */
export function verifyCompany(company: any): any {
    return CachedBrregLookup.verify(company);
}

// ============================================
// Brreg Update Monitor (Stage 1.25)
// Uses free /api/oppdateringer/enheter feed + /api/enheter/{orgnr}/roller
// Zero Firecrawl credits, zero Gemini tokens
// ============================================

export interface BrregUpdateResult {
    company_name: string;
    org_number: string;
    change_type: 'status_change' | 'role_change';
    trigger_category: string;
    excerpt: string;
    source_url: string;
    update_date: string;
}

interface BrregEnhetUpdate {
    oppdateringsid: number;
    dato: string;
    organisasjonsnummer: string;
    endringstype: 'Endring' | 'Ny' | 'Sletting';
    endringer?: BrregChange[];
}

interface BrregChange {
    op: 'replace' | 'add' | 'remove';
    path: string;
    value?: any;
}

// Role types relevant for interim leadership signals
const MONITORED_ROLE_TYPES = ['DAGL', 'LEDE', 'NEST', 'BOBE', 'INNH'];

function isRelevantStatusChange(change: BrregChange): boolean {
    const path = change.path;

    // Company being deleted from registry — no interim need
    if (path === '/slettedato' && change.op === 'add') return false;

    // Konkurs: only interesting when set to true
    if (path === '/konkurs') {
        return (change.op === 'add' || change.op === 'replace') && change.value === true;
    }

    // Avvikling/tvangsoppløsning: only when set to true
    if (path === '/underAvvikling' || path === '/underTvangsavviklingEllerTvangsopplosning') {
        return (change.op === 'add' || change.op === 'replace') && change.value === true;
    }

    // Organisasjonsform change (M&A signal)
    if (path === '/organisasjonsform' && change.op === 'replace') {
        return true;
    }

    return false;
}

function mapChangesToTrigger(changes: BrregChange[]): string {
    for (const c of changes) {
        if (['/konkurs', '/underAvvikling', '/underTvangsavviklingEllerTvangsopplosning'].includes(c.path)) {
            return 'Restructuring';
        }
        if (c.path === '/organisasjonsform') {
            return 'MergersAcquisitions';
        }
    }
    return 'Restructuring';
}

function buildStatusExcerpt(changes: BrregChange[], company: BrregCompany | null, date: string): string {
    const parts: string[] = [];

    for (const c of changes) {
        if (!isRelevantStatusChange(c)) continue;
        if (c.path === '/konkurs' && c.value === true) parts.push('Konkurs registrert');
        if (c.path === '/underAvvikling' && c.value === true) parts.push('Under avvikling');
        if (c.path === '/underTvangsavviklingEllerTvangsopplosning' && c.value === true) parts.push('Under tvangsavvikling/tvangsoppløsning');
        if (c.path === '/organisasjonsform') parts.push(`Organisasjonsform endret`);
    }

    const employees = company?.antallAnsatte || 0;
    const dateStr = date.split('T')[0];
    return `${parts.join('. ')} (${dateStr}). ${employees} ansatte.`;
}

/**
 * Fetch company status updates from Brreg enheter updates API.
 * Paginates through all results for the lookback period.
 * Filters to only relevant status changes (konkurs, avvikling, tvangs, orgform).
 */
async function fetchEnhetUpdates(days: number): Promise<BrregEnhetUpdate[]> {
    const results: BrregEnhetUpdate[] = [];
    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const fromISO = fromDate.toISOString();

    const PAGE_SIZE = 200;
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages) {
        const url = `${BASE_URL}/oppdateringer/enheter?dato=${fromISO}&size=${PAGE_SIZE}&page=${currentPage}&includeChanges=true`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'InterimLeadAgent/1.0 (https://incepto.no)',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn(`Brreg updates API error: ${response.status}`);
                break;
            }

            const data = await response.json();
            totalPages = data.page?.totalPages || 1;

            const updates: BrregEnhetUpdate[] = data._embedded?.oppdaterteEnheter || [];

            for (const update of updates) {
                if (update.endringstype === 'Sletting') continue;
                const changes = update.endringer || [];
                const hasRelevant = changes.some(c => isRelevantStatusChange(c));
                if (hasRelevant) {
                    results.push(update);
                }
            }

            currentPage++;

            // Polite delay between pages
            if (currentPage < totalPages) {
                await new Promise(r => setTimeout(r, 50));
            }
        } catch (error) {
            console.error(`Brreg updates API fetch error (page ${currentPage}):`, error);
            break;
        }
    }

    console.log(`  -> Scanned ${currentPage} pages, found ${results.length} relevant status changes`);
    return results;
}

/**
 * Fetch roles for specific companies and detect recent leadership changes.
 * Checks sistEndret on monitored role types (DAGL, LEDE, NEST, BOBE, INNH).
 */
async function fetchRoleChanges(
    orgNumbers: string[],
    lookbackDays: number,
    companyNames: Map<string, string>
): Promise<BrregUpdateResult[]> {
    const results: BrregUpdateResult[] = [];
    const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const CONCURRENCY = 5;
    for (let i = 0; i < orgNumbers.length; i += CONCURRENCY) {
        const batch = orgNumbers.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.allSettled(
            batch.map(async (orgNr) => {
                const url = `${BASE_URL}/enheter/${orgNr}/roller`;
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'InterimLeadAgent/1.0 (https://incepto.no)',
                        'Accept': 'application/json',
                    },
                });
                if (!response.ok) return null;
                return { orgNr, data: await response.json() };
            })
        );

        for (const result of batchResults) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const { orgNr, data } = result.value;

            const rollegrupper = data.rollegrupper || [];
            for (const group of rollegrupper) {
                const roleCode = group.type?.kode;
                if (!MONITORED_ROLE_TYPES.includes(roleCode)) continue;

                const sistEndret = group.sistEndret;
                if (!sistEndret || sistEndret < cutoffStr) continue;

                const roleName = group.type?.beskrivelse || roleCode;
                const currentHolder = group.roller?.find(
                    (r: any) => !r.fratraadt && !r.avregistrert
                );
                const previousHolder = group.roller?.find(
                    (r: any) => r.fratraadt || r.avregistrert
                );

                const formatName = (person: any) => {
                    if (!person?.person?.navn) return null;
                    const n = person.person.navn;
                    return `${n.fornavn || ''} ${n.etternavn || ''}`.trim();
                };

                const currentName = formatName(currentHolder) || 'Ukjent';
                const previousName = formatName(previousHolder);

                let excerpt = `${roleName} endret ${sistEndret}. Ny: ${currentName}.`;
                if (previousName) {
                    excerpt += ` Tidligere: ${previousName}.`;
                }

                results.push({
                    company_name: companyNames.get(orgNr) || 'Ukjent',
                    org_number: orgNr,
                    change_type: 'role_change',
                    trigger_category: roleCode === 'BOBE' ? 'Restructuring' : 'LeadershipChange',
                    excerpt,
                    source_url: `https://data.brreg.no/enhetsregisteret/oppslag/enheter/${orgNr}`,
                    update_date: sistEndret,
                });
            }
        }

        if (i + CONCURRENCY < orgNumbers.length) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    return results;
}

/**
 * Main orchestrator: Brreg Update Monitor
 * Phase A: Company status changes from /api/oppdateringer/enheter
 * Phase B: Role change detection via /api/enheter/{orgnr}/roller
 *
 * Cost: ZERO (all free government APIs)
 */
export async function fetchBrregUpdates(days: number = 2): Promise<BrregUpdateResult[]> {
    const results: BrregUpdateResult[] = [];
    const brregLookup = new CachedBrregLookup();
    let skippedLowEmployee = 0;
    let skippedNotOstlandet = 0;

    // Phase A: Company status changes
    console.log(`📊 Fetching Brreg enheter updates (last ${days} days)...`);
    const statusUpdates = await fetchEnhetUpdates(days);

    if (statusUpdates.length === 0) {
        console.log('📊 No relevant status changes found');
        return results;
    }

    // Batch lookup for Østlandet verification
    const orgNumbers = statusUpdates.map(u => u.organisasjonsnummer);
    const companyData = await brregLookup.batchLookup(orgNumbers);

    // Build name lookup for role change phase
    const companyNames = new Map<string, string>();
    const verifiedOrgNumbers: string[] = [];

    for (const update of statusUpdates) {
        const orgNr = update.organisasjonsnummer;
        const company = companyData.get(orgNr) || null;

        // For status changes, only check Østlandet (same pattern as Stage 1 bankruptcies)
        // Don't use full hard_stop since avvikling/konkurs IS the trigger
        const verification = CachedBrregLookup.verify(company);
        if (!verification.is_ostlandet) {
            skippedNotOstlandet++;
            continue;
        }

        // Skip low-employee companies for status updates (avvikling/konkurs)
        // These are typically dormant shell companies with no interim leadership need
        const employees = company?.antallAnsatte || 0;
        if (employees < MIN_EMPLOYEES_FOR_STATUS_UPDATE) {
            skippedLowEmployee++;
            continue;
        }

        const name = company?.navn || 'Ukjent';
        companyNames.set(orgNr, name);
        verifiedOrgNumbers.push(orgNr);

        const relevantChanges = (update.endringer || []).filter(c => isRelevantStatusChange(c));
        results.push({
            company_name: name,
            org_number: orgNr,
            change_type: 'status_change',
            trigger_category: mapChangesToTrigger(relevantChanges),
            excerpt: buildStatusExcerpt(update.endringer || [], company, update.dato),
            source_url: `https://data.brreg.no/enhetsregisteret/oppslag/enheter/${orgNr}`,
            update_date: update.dato,
        });
    }

    // Phase B: Role changes for verified Østlandet companies
    if (verifiedOrgNumbers.length > 0) {
        console.log(`📊 Checking role changes for ${verifiedOrgNumbers.length} companies...`);
        const roleChanges = await fetchRoleChanges(verifiedOrgNumbers, days, companyNames);
        results.push(...roleChanges);
    }

    // Log filtering summary
    if (skippedLowEmployee > 0 || skippedNotOstlandet > 0) {
        console.log(`📊 Brreg filter: skipped ${skippedLowEmployee} (<${MIN_EMPLOYEES_FOR_STATUS_UPDATE} employees), ${skippedNotOstlandet} (not Østlandet)`);
    }
    console.log(`📊 Brreg Update Monitor: ${results.length} signals found`);
    return results;
}

/**
 * Enriches a sparse Brreg signal with contextual details for better AI summaries
 * Takes raw seed data and Brreg company data, returns detailed narrative text
 */
export function enrichBrregSeed(seed: any, enhet: BrregCompany | null): string {
    if (!enhet) {
        return seed.raw_content || seed.excerpt || 'Statusendring registrert i Brønnøysund.';
    }

    const parts: string[] = [];

    // 1. Status change details
    if (seed.source_type === 'brreg_status_update') {
        const changeDate = new Date(seed.created_at || Date.now()).toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        let statusDescription = 'endret status';
        if (enhet.konkurs) statusDescription = 'gikk konkurs';
        else if (enhet.underAvvikling) statusDescription = 'er under avvikling';
        else if (enhet.underTvangsavviklingEllerTvangsopplosning) statusDescription = 'er under tvangsavvikling';

        parts.push(`Selskapet ${enhet.navn} ${statusDescription} den ${changeDate}.`);
    } else if (seed.source_type === 'brreg_role_change') {
        parts.push(`${enhet.navn} har gjennomført rolleendringer i ledelsen.`);
    } else {
        parts.push(`${enhet.navn} er registrert med endringer i Brønnøysundregistrene.`);
    }

    // 2. Company context - industry
    if (enhet.naeringskode1?.beskrivelse) {
        parts.push(`Selskapet opererer innen ${enhet.naeringskode1.beskrivelse.toLowerCase()}.`);
    }

    // 3. Company size
    if (enhet.antallAnsatte !== undefined && enhet.antallAnsatte !== null) {
        if (enhet.antallAnsatte === 0) {
            parts.push(`Selskapet har ingen registrerte ansatte.`);
        } else if (enhet.antallAnsatte === 1) {
            parts.push(`Selskapet har 1 ansatt.`);
        } else {
            parts.push(`Selskapet har ${enhet.antallAnsatte} ansatte.`);
        }
    }

    // 4. Role change details (if applicable and present in metadata)
    if (seed.source_type === 'brreg_role_change' && seed.excerpt) {
        parts.push(seed.excerpt);
    }

    // 5. Location context
    const location = enhet.forretningsadresse?.kommune
        || enhet.forretningsadresse?.poststed
        || 'Oslo-området';
    parts.push(`Selskapet er lokalisert i ${location}.`);

    // 6. Company age (if available)
    if (enhet.stiftelsesdato) {
        const founded = new Date(enhet.stiftelsesdato);
        const yearsOld = new Date().getFullYear() - founded.getFullYear();
        if (yearsOld > 0) {
            parts.push(`Selskapet ble stiftet for ${yearsOld} år siden.`);
        }
    }

    return parts.join(' ');
}
