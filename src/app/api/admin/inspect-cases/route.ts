import { NextRequest, NextResponse } from 'next/server';
import { caseFiles } from '@/lib/airtable';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    try {
        const records = await caseFiles.select({
            maxRecords: 30,
            sort: [{ field: 'created_at', direction: 'desc' }]
        }).firstPage();

        const cases = records.map(r => ({
            id: r.id,
            company_name: r.fields.company_name,
            org_number: r.fields.org_number,
            status: r.fields.status,
            E: r.fields.E,
            W: r.fields.W,
            V: r.fields.V,
            R: r.fields.R,
            stars: r.fields.stars,
            trigger_hypothesis: r.fields.trigger_hypothesis,
            suggested_role: r.fields.suggested_role,
            source_type: r.fields.source_type,
            is_ostlandet: r.fields.is_ostlandet,
            has_operations: r.fields.has_operations,
            why_now_text: r.fields.why_now_text,
        }));

        return NextResponse.json({
            success: true,
            count: cases.length,
            cases
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
