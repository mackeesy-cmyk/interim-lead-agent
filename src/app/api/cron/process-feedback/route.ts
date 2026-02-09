import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth';
import { getFeedbackForBatching } from '@/lib/airtable';
import { getScoringWeights, updateScoringWeights, resetScoringWeights, ScoreWeights } from '@/config/scoring-config';
import { calculateFeedbackAdjustments } from '@/lib/feedback-engine';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes max

// State file to track processed feedback IDs
const FEEDBACK_STATE_PATH = path.join(process.cwd(), 'src/config/feedback-state.json');

interface FeedbackState {
    processedIds: string[];
    lastRun: string;
}

function getFeedbackState(): FeedbackState {
    if (fs.existsSync(FEEDBACK_STATE_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(FEEDBACK_STATE_PATH, 'utf-8'));
        } catch (e) {
            console.error('Failed to read feedback state', e);
        }
    }
    return { processedIds: [], lastRun: new Date().toISOString() };
}

function saveFeedbackState(state: FeedbackState) {
    const dir = path.dirname(FEEDBACK_STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FEEDBACK_STATE_PATH, JSON.stringify(state, null, 2));
}

export async function GET(request: NextRequest) {
    const authError = requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const mode = 'production'; // Cron jobs usually run in production context

    try {
        const state = getFeedbackState();
        const feedbackItems = await getFeedbackForBatching(state.processedIds);

        const newFeedbackCount = feedbackItems.length;

        // Addendum §5: Minimum 10 feedback points before any adjustment
        if (newFeedbackCount < 10 && !force) {
            logger.info(`Not enough new feedback to adjust weights. Found ${newFeedbackCount}, need 10.`, { mode, component: 'feedback-cron' });
            return NextResponse.json({ message: 'Not enough feedback', count: newFeedbackCount, required: 10 });
        }

        logger.info(`Processing ${newFeedbackCount} new feedback items for rule-based adjustment`, { mode, component: 'feedback-cron' });

        const currentWeights = getScoringWeights();

        const { newWeights, adjustments, stats } = calculateFeedbackAdjustments(feedbackItems, currentWeights);

        const changesMade = Object.keys(adjustments).length > 0;

        if (changesMade) {
            // Log adjustments
            for (const [source, adj] of Object.entries(adjustments)) {
                logger.info(`Adjusting weights for ${source}: E ${adj.E > 0 ? '+' : ''}${adj.E.toFixed(3)}, W ${adj.W > 0 ? '+' : ''}${adj.W.toFixed(3)}, R ${adj.R > 0 ? '+' : ''}${adj.R.toFixed(3)}`, { mode, component: 'feedback-cron' });
            }

            updateScoringWeights(newWeights);

            // Save state
            const processedIds = [...state.processedIds, ...feedbackItems.map(i => i.id!)];
            saveFeedbackState({
                processedIds,
                lastRun: new Date().toISOString()
            });
            return NextResponse.json({
                success: true,
                message: 'Weights adjusted',
                sources_updated: Object.keys(adjustments),
                stats
            });
        } else {
            return NextResponse.json({ success: true, message: 'No significant adjustments needed', stats });
        }

    } catch (error) {
        logger.error('Feedback processing failed', error, { mode, component: 'feedback-cron' });
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
