import { NextRequest, NextResponse } from 'next/server';
import { seeds } from '@/lib/airtable';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    try {
        // Fetch the last 10 processed seeds
        // Note: Airtable 'processed' checkbox field is 1/0 or TRUE/FALSE
        const records = await seeds.select({
            maxRecords: 10,
            sort: [{ field: 'collected_at', direction: 'desc' }]
        }).firstPage();

        if (records.length === 0) {
            return NextResponse.json({ message: "No seeds found." });
        }

        const updates = records.map(record => ({
            id: record.id,
            fields: {
                processed: false
            }
        }));

        // Batch update to reset them
        await seeds.update(updates);

        return NextResponse.json({
            success: true,
            message: `Reset ${updates.length} seeds to unprocessed.`,
            ids: updates.map(u => u.id)
        });
    } catch (error) {
        console.error("Reset error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
