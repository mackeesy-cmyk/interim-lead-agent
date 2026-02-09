import { NextRequest, NextResponse } from 'next/server';
import { seeds } from '@/lib/airtable';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    try {
        const records = await seeds.select({
            maxRecords: 100
        }).all();

        // Delete all records
        const recordIds = records.map(r => r.id);

        if (recordIds.length === 0) {
            return NextResponse.json({ message: "No records to delete" });
        }

        // Airtable delete in batches of 10
        const batches = [];
        for (let i = 0; i < recordIds.length; i += 10) {
            batches.push(recordIds.slice(i, i + 10));
        }

        for (const batch of batches) {
            await seeds.destroy(batch);
        }

        return NextResponse.json({
            success: true,
            message: `Deleted ${recordIds.length} test seeds. Ready for fresh collection.`
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
