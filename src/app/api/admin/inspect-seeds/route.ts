import { NextRequest, NextResponse } from 'next/server';
import { seeds } from '@/lib/airtable';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    try {
        const records = await seeds.select({
            maxRecords: 10,
            sort: [{ field: 'collected_at', direction: 'desc' }]
        }).firstPage();

        const seedData = records.map(r => ({
            id: r.id,
            company_name: r.fields.company_name,
            source_type: r.fields.source_type,
            source_url: r.fields.source_url,
            trigger_detected: r.fields.trigger_detected,
            collected_at: r.fields.collected_at,
            processed: r.fields.processed
        }));

        return NextResponse.json({
            success: true,
            count: seedData.length,
            seeds: seedData
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
