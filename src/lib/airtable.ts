import '@/lib/env';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

// Table references
export const seeds = base('Seeds');
export const caseFiles = base('CaseFiles');
export const evidence = base('Evidence');
export const weeklyReports = base('WeeklyReports');

// ============================================
// TYPES
// ============================================
export interface Seed {
    id: string;
    company_name?: string;
    org_number?: string;
    source_type: string;
    source_url?: string;
    trigger_detected?: string;
    excerpt?: string;
    raw_content?: string;
    collected_at: string;
    processed?: boolean;
    // Addendum §6: LinkedIn seed fields
    linkedin_type?: 'EXEC_MOVE' | 'COMPANY_SIGNAL';
    linkedin_status?: 'queued' | 'consumed' | 'rejected';
}

export interface CaseFile {
    id?: string;
    company_name: string;
    org_number: string;
    trigger_hypothesis?: string;
    secondary_triggers?: string[];
    E: number;  // Evidence strength
    W: number;  // Will/Need
    V: number;  // Verification (Brønnøysund)
    R: number;  // Risk
    status: 'pending' | 'processing' | 'qualified' | 'dropped';
    why_now_text?: string;
    drop_reason?: string;
    processed_at?: string;
    suggested_role?: string;
    sources_checked?: string;
    iteration_count?: number;
    is_ostlandet?: boolean;
    has_operations?: boolean;
    created_at?: string;
    qualified_at?: string;
    report_date?: string;
    feedback_grade?: 'Relevant' | 'Delvis' | 'Ikke';
    why_now_valid?: boolean;
    feedback_notes?: string;
    source_url?: string;
    stars?: number;
    C?: number;
    source_type?: string;
    case_summary?: string;
}

export interface Evidence {
    id?: string;
    case_file_id: string;  // Link to CaseFiles
    source_type: string;   // 'dn_rss', 'newsweb', 'firecrawl', etc.
    source_url: string;
    title?: string;
    excerpt: string;
    collected_at: string;
    relevance_score?: number;  // How relevant was this evidence (0-1)
}


// ============================================
// OPTIMIZED READ OPERATIONS
// ============================================

/**
 * Hent alle ubehandlede seeds i ETT kall
 */
export async function getUnprocessedSeeds(): Promise<Seed[]> {
    const records = await seeds
        .select({
            filterByFormula: "NOT({processed})",
            maxRecords: 100,
            sort: [{ field: 'collected_at', direction: 'asc' }],
        })
        .all();

    return records.map(r => ({
        id: r.id,
        ...(r.fields as any),
    })) as Seed[];
}

/**
 * Hent kvalifiserte leads for rapportering
 */
export async function getQualifiedLeads(since?: Date): Promise<CaseFile[]> {
    let formula = "{status} = 'qualified'";

    if (since) {
        const dateStr = since.toISOString().split('T')[0];
        formula = `AND({status} = 'qualified', {processed_at} >= '${dateStr}')`;
    }

    const records = await caseFiles
        .select({
            filterByFormula: formula,
            sort: [{ field: 'processed_at', direction: 'desc' }],
        })
        .all();

    return records.map(r => ({
        id: r.id,
        ...(r.fields as any),
    })) as CaseFile[];
}

/**
 * Hent kvalifiserte leads for en spesifikk dato (mandagsrapport)
 */
export async function getQualifiedLeadsForReport(date: string): Promise<CaseFile[]> {
    const records = await caseFiles
        .select({
            filterByFormula: `AND({status} = 'qualified', {report_date} = '${date}')`,
            sort: [{ field: 'stars', direction: 'desc' }],
        })
        .all();

    return records.map(r => ({
        id: r.id,
        ...(r.fields as any),
    })) as CaseFile[];
}

/**
 * Hent alle case files (leads) for dashboardet
 */
export async function getCaseFiles(status?: string): Promise<CaseFile[]> {
    const filter = status ? `{status} = '${status}'` : '';
    const records = await caseFiles.select({
        filterByFormula: filter,
        sort: [{ field: 'created_at', direction: 'desc' }]
    }).all();

    return records.map(r => ({
        id: r.id,
        ...r.fields
    } as CaseFile));
}

/**
 * Hent feedback for batch-prosessering (Addendum §5)
 */
export async function getFeedbackForBatching(excludeIds: string[] = []): Promise<CaseFile[]> {
    const records = await caseFiles
        .select({
            filterByFormula: "AND({feedback_grade} != '', {feedback_grade} != BLANK())",
            maxRecords: 100, // Process max 100 at a time to be safe
            sort: [{ field: 'qualified_at', direction: 'desc' }],
        })
        .all();

    return records
        .map(r => ({
            id: r.id,
            ...(r.fields as any),
        }))
        .filter(r => !excludeIds.includes(r.id!)) as CaseFile[];
}

// ============================================
// OPTIMIZED WRITE OPERATIONS (BATCH)
// ============================================

/**
 * Batch create - oppretter mange records på en gang
 * Airtable støtter maks 10 per kall
 */
export async function batchCreateCaseFiles(
    cases: Omit<CaseFile, 'id'>[]
): Promise<string[]> {
    const ids: string[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < cases.length; i += BATCH_SIZE) {
        const batch = cases.slice(i, i + BATCH_SIZE);
        const records = await caseFiles.create(
            batch.map(c => ({ fields: c as any }))
        );
        console.log(`✅ Created ${records.length} records in CaseFiles`);
        ids.push(...records.map(r => r.id));
    }

    return ids;
}

/**
 * Batch update - oppdaterer mange records på en gang
 */
export async function batchUpdateCaseFiles(
    updates: Array<{ id: string; fields: Partial<CaseFile> }>
): Promise<void> {
    const BATCH_SIZE = 10;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await caseFiles.update(batch.map(u => ({
            id: u.id,
            fields: u.fields as any,
        })));
    }
}

/**
 * Batch create evidence records
 */
export async function batchCreateEvidence(
    evidenceItems: Omit<Evidence, 'id'>[]
): Promise<string[]> {
    const ids: string[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < evidenceItems.length; i += BATCH_SIZE) {
        const batch = evidenceItems.slice(i, i + BATCH_SIZE);
        const records = await evidence.create(
            batch.map(e => ({ fields: e as any }))
        );
        ids.push(...records.map(r => r.id));
    }

    console.log(`📎 Created ${ids.length} evidence records`);
    return ids;
}


/**
 * Batch update seeds status
 */
export async function batchUpdateSeedsStatus(
    seedIds: string[],
    processed: boolean
): Promise<void> {
    const BATCH_SIZE = 10;

    for (let i = 0; i < seedIds.length; i += BATCH_SIZE) {
        const batch = seedIds.slice(i, i + BATCH_SIZE);
        await seeds.update(batch.map(id => ({
            id,
            fields: { processed },
        })));
    }
}

// ============================================
// SINGLE RECORD OPERATIONS (legacy support)
// ============================================

export async function createCaseFile(data: Omit<CaseFile, 'id'>): Promise<string> {
    const ids = await batchCreateCaseFiles([data]);
    return ids[0];
}

export async function updateCaseFile(id: string, updates: Partial<CaseFile>): Promise<void> {
    await batchUpdateCaseFiles([{ id, fields: updates }]);
}

export async function updateSeedStatus(id: string, processed: boolean): Promise<void> {
    await batchUpdateSeedsStatus([id], processed);
}

/**
 * Opprett en ny seed (Legacy support)
 */
export async function createSeed(data: Omit<Seed, 'id'>): Promise<string> {
    const records = await seeds.create([
        { fields: data as any }
    ]);
    return records[0].id;
}

// Addendum §4: Lead identity = (company, trigger-type, suggested role)
// A company can appear again if the interim role is new
export async function checkDuplicate(orgNumber: string, trigger?: string, role?: string): Promise<boolean> {
    // Escape single quotes in values to prevent Airtable formula issues
    const safeOrg = orgNumber.replace(/'/g, "\\'");

    let formula = `AND({org_number} = '${safeOrg}', {status} = 'qualified'`;
    if (trigger) {
        const safeTrigger = trigger.replace(/'/g, "\\'");
        formula += `, {trigger_hypothesis} = '${safeTrigger}'`;
    }
    if (role) {
        const safeRole = role.replace(/'/g, "\\'");
        formula += `, {suggested_role} = '${safeRole}'`;
    }
    formula += ')';

    const records = await caseFiles
        .select({
            filterByFormula: formula,
            maxRecords: 1,
        })
        .all();

    return records.length > 0;
}
