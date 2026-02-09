import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * End-to-End Test Endpoint ("God Mode")
 * Triggers the entire pipeline in sequence:
 * 1. Seed Collection
 * 2. ESL+ Processing (Scoring, Seeking, Verification)
 * 3. Report Generation
 */
export async function POST(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;
    const results: any = {};

    try {
        console.log('🚀 Starting E2E Pipeline Test...');

        // 1. Collect Seeds
        console.log('Step 1: Collecting Seeds...');
        const collectRes = await fetch(`${baseUrl}/api/cron/collect-seeds`, {
            headers: { Authorization: `Bearer ${cronSecret}` }
        });
        results.collect = await collectRes.json();

        // 2. Process ESL+
        console.log('Step 2: Processing ESL+...');
        const processRes = await fetch(`${baseUrl}/api/process-esl`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${cronSecret}` }
        });
        results.process = await processRes.json();

        // 3. Generate Report
        console.log('Step 3: Generating Report...');
        const reportRes = await fetch(`${baseUrl}/api/cron/generate-report`, {
            headers: { Authorization: `Bearer ${cronSecret}` }
        });
        results.report = await reportRes.json();

        return NextResponse.json({
            success: true,
            pipeline_results: results
        });

    } catch (error) {
        console.error('E2E Pipeline failed:', error);
        return NextResponse.json(
            { error: 'E2E Pipeline Test failed', details: String(error) },
            { status: 500 }
        );
    }
}

// Allow GET for easy browser testing
export async function GET(request: NextRequest) {
    return POST(request);
}
