import { NextRequest, NextResponse } from 'next/server';
import { createSeed } from '@/lib/airtable';
import { requireAuth } from '@/lib/auth';

/**
 * LinkedIn Seed Ingestion (Addendum §6)
 *
 * Accepts two seed types:
 * - EXEC_MOVE: Person takes new CxO role → LeadershipChange trigger
 * - COMPANY_SIGNAL: Post with relevant company info → varies by content
 *
 * LinkedIn seeds only affect which case files are investigated;
 * verification always happens via P0/P1 sources (Brreg, etc.)
 */
export async function POST(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { type, company_name, person_name, role, signal_text } = body;

        // Validate seed type
        if (!type || !['EXEC_MOVE', 'COMPANY_SIGNAL'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid type. Must be EXEC_MOVE or COMPANY_SIGNAL.' },
                { status: 400 }
            );
        }

        // Validate required fields per type
        if (type === 'EXEC_MOVE') {
            if (!company_name || !person_name || !role) {
                return NextResponse.json(
                    { error: 'EXEC_MOVE requires company_name, person_name, and role.' },
                    { status: 400 }
                );
            }
        }

        if (type === 'COMPANY_SIGNAL') {
            if (!company_name || !signal_text) {
                return NextResponse.json(
                    { error: 'COMPANY_SIGNAL requires company_name and signal_text.' },
                    { status: 400 }
                );
            }
        }

        // Build seed data
        const sourceType = type === 'EXEC_MOVE' ? 'linkedin_exec_move' : 'linkedin_company_signal';
        const trigger = type === 'EXEC_MOVE' ? 'LeadershipChange' : 'HiringSignal';
        const excerpt = type === 'EXEC_MOVE'
            ? `${person_name} tiltrer som ${role} hos ${company_name}.`
            : `${signal_text}`.slice(0, 500);

        const seedId = await createSeed({
            company_name,
            org_number: body.org_number || '',
            source_type: sourceType,
            source_url: body.url || '',
            trigger_detected: trigger,
            excerpt,
            collected_at: new Date().toISOString(),
            processed: false,
            linkedin_type: type,
            linkedin_status: 'queued',
        });

        console.log(`📎 LinkedIn seed created: ${type} for ${company_name} (${seedId})`);

        return NextResponse.json({
            success: true,
            seed_id: seedId,
            type,
            company_name,
            status: 'queued',
        });
    } catch (error) {
        console.error('LinkedIn seed ingestion failed:', error);
        return NextResponse.json(
            { error: 'Failed to create LinkedIn seed', details: String(error) },
            { status: 500 }
        );
    }
}
