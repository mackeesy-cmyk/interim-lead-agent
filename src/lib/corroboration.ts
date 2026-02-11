/**
 * Cross-Source Corroboration Engine
 * Groups seeds by company and computes confidence boosts
 * when the same company appears from multiple independent sources.
 */

export interface CorroboratedSeedGroup {
    canonical_org_number: string;
    canonical_name: string;
    seeds: any[];
    source_types: string[];
    source_count: number;
    corroboration_boost: number; // 0.0 to 0.15
    merged_raw_content: string;
    merged_triggers: string[];
    primary_seed: any; // Highest-confidence seed
    all_seed_ids: string[];
}

// Source independence weights — higher = more credible/independent
const SOURCE_INDEPENDENCE: Record<string, number> = {
    bronnysund: 1.0,
    brreg_status_update: 1.0,
    brreg_role_change: 0.9,
    brreg_kunngjoringer: 0.8,
    dn_rss: 0.8,
    e24: 0.8,
    finansavisen: 0.7,
    ntb: 0.6,
    newsweb: 0.7,
    linkedin_exec_move: 0.6,
    linkedin_company_signal: 0.5,
    finn: 0.3,
    default: 0.4,
};

/**
 * Groups seeds by company identity and computes corroboration boosts.
 * Seeds from multiple independent sources about the same company
 * get a boost to E and W scores (max +0.15).
 */
export function groupSeedsByCompany(seeds: any[]): CorroboratedSeedGroup[] {
    const byOrg = new Map<string, any[]>();
    const unmatched: any[] = [];

    // Phase 1: Group by org_number (exact match)
    for (const seed of seeds) {
        const orgNr = seed.org_number?.replace(/\s/g, '');
        if (orgNr && orgNr.length >= 9) {
            const existing = byOrg.get(orgNr) || [];
            existing.push(seed);
            byOrg.set(orgNr, existing);
        } else {
            unmatched.push(seed);
        }
    }

    // Phase 2: For seeds without org_number, try fuzzy name match against known groups
    for (const seed of unmatched) {
        const name = seed.company_name?.toLowerCase().trim();
        if (!name) continue;

        let matched = false;
        for (const [, group] of byOrg) {
            const groupName = group[0].company_name?.toLowerCase().trim();
            if (groupName && fuzzyNameMatch(name, groupName)) {
                group.push(seed);
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Create standalone group keyed by name
            const key = `name:${name}`;
            const existing = byOrg.get(key) || [];
            existing.push(seed);
            byOrg.set(key, existing);
        }
    }

    // Phase 3: Build CorroboratedSeedGroups
    return Array.from(byOrg.entries()).map(([, groupSeeds]) => {
        const sourceTypes = [...new Set(groupSeeds.map((s: any) => s.source_type).filter(Boolean))];

        // Corroboration boost: increases with number of independent sources
        // Single source = 0 boost; two independent sources = 0.05-0.10 boost
        const independenceSum = sourceTypes.reduce((sum, st) => {
            return sum + (SOURCE_INDEPENDENCE[st] || SOURCE_INDEPENDENCE.default);
        }, 0);
        const corroborationBoost = Math.min(0.15, Math.max(0, (independenceSum - 1) * 0.05));

        // Merge raw_content from all seeds
        const mergedContent = groupSeeds
            .map((s: any) => `[${s.source_type}]: ${s.raw_content || s.excerpt || ''}`)
            .join('\n---\n');

        // Pick primary seed: highest source independence
        const primary = [...groupSeeds].sort((a: any, b: any) => {
            const aConf = SOURCE_INDEPENDENCE[a.source_type] || SOURCE_INDEPENDENCE.default;
            const bConf = SOURCE_INDEPENDENCE[b.source_type] || SOURCE_INDEPENDENCE.default;
            return bConf - aConf;
        })[0];

        const mergedTriggers = [...new Set(
            groupSeeds.map((s: any) => s.trigger_detected).filter(Boolean)
        )] as string[];

        return {
            canonical_org_number: primary.org_number || '',
            canonical_name: primary.company_name || '',
            seeds: groupSeeds,
            source_types: sourceTypes,
            source_count: sourceTypes.length,
            corroboration_boost: corroborationBoost,
            merged_raw_content: mergedContent,
            merged_triggers: mergedTriggers,
            primary_seed: primary,
            all_seed_ids: groupSeeds.map((s: any) => s.id).filter(Boolean),
        };
    });
}

/**
 * Fuzzy company name matching.
 * Normalizes by removing common suffixes (AS, ASA, Holding, etc.)
 * and checks for substantial overlap.
 */
function fuzzyNameMatch(a: string, b: string): boolean {
    const normA = normalizeName(a);
    const normB = normalizeName(b);

    if (!normA || !normB) return false;
    if (normA === normB) return true;

    // Only allow substring matching for names with 4+ chars to avoid false positives
    if (normA.length >= 4 && normB.length >= 4) {
        return normA.includes(normB) || normB.includes(normA);
    }

    return false;
}

function normalizeName(name: string): string {
    return name
        .replace(/\b(as|asa|holding|group|gruppen|norge|norway)\b/gi, '')
        .replace(/[^a-zA-Z0-9\u00C0-\u017F]/g, '')
        .toLowerCase()
        .trim();
}
