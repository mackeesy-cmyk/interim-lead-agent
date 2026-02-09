import { NextRequest, NextResponse } from 'next/server';
import { fetchDNRSS, fetchE24RSS, fetchFinansavisenRSS, preFilterItems } from '@/lib/rss';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    try {
        const dnItems = await fetchDNRSS();
        const e24Items = await fetchE24RSS();
        const finItems = await fetchFinansavisenRSS();

        const allItems = [...dnItems, ...e24Items, ...finItems];
        const filtered = preFilterItems(allItems);

        return NextResponse.json({
            total_items: allItems.length,
            filtered_items: filtered.length,
            sample_unfiltered: allItems.slice(0, 5).map(i => ({ title: i.title, description: i.description?.slice(0, 100) })),
            sample_filtered: filtered.slice(0, 5).map(i => ({ title: i.title, description: i.description?.slice(0, 100) }))
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
