import { CaseFile } from '@/lib/airtable';
import { ScoreWeights, ScoringConfig } from '@/config/scoring-config';

interface FeedbackStats {
    total: number;
    relevant: number;
    delvis: number;
    ikke: number;
}

export interface FeedbackAdjustmentResult {
    newWeights: ScoringConfig;
    adjustments: Record<string, { E: number, W: number, R: number }>; // Diff for logging
    stats: Record<string, FeedbackStats>;
}

/**
 * Calculates new scoring weights based on feedback batch.
 * Implements Addendum §5 rules:
 * - Requires >= 10 items total (handled by caller usually, but we can double check)
 * - Max +/- 10% change per cycle
 * - Logic:
 *   - Relevance > 60% -> +5% to E and W
 *   - Irrelevance > 50% -> -5% to E and W, +5% to R
 */
export function calculateFeedbackAdjustments(
    feedbackItems: CaseFile[],
    currentWeights: ScoringConfig
): FeedbackAdjustmentResult {
    const newWeights: ScoringConfig = JSON.parse(JSON.stringify(currentWeights));
    const adjustments: Record<string, { E: number, W: number, R: number }> = {};
    const sourceGroups: Record<string, FeedbackStats> = {};

    // 1. Group by source_type
    for (const item of feedbackItems) {
        const source = item.source_type || 'default';
        if (!sourceGroups[source]) {
            sourceGroups[source] = { total: 0, relevant: 0, delvis: 0, ikke: 0 };
        }
        sourceGroups[source].total++;
        if (item.feedback_grade === 'Relevant') sourceGroups[source].relevant++;
        else if (item.feedback_grade === 'Delvis') sourceGroups[source].delvis++;
        else if (item.feedback_grade === 'Ikke') sourceGroups[source].ikke++;
    }

    // 2. Calculate adjustments
    for (const [source, stats] of Object.entries(sourceGroups)) {
        if (!newWeights[source]) continue; // Skip unknown sources

        const weights = newWeights[source];
        const originalWeights = currentWeights[source];

        // Require minimum 3 items per source to avoid noisy single-item adjustments
        if (stats.total < 3) continue;

        const relevanceRatio = (stats.relevant + 0.5 * stats.delvis) / stats.total;
        const irrelevanceRatio = stats.ikke / stats.total;

        let adjustmentFactor = 1.0;
        let riskFactor = 1.0;

        if (relevanceRatio > 0.6) {
            adjustmentFactor = 1.05; // +5%
        } else if (irrelevanceRatio > 0.5) {
            adjustmentFactor = 0.95; // -5%
            riskFactor = 1.05;       // Increase risk if irrelevant
        }

        if (adjustmentFactor !== 1.0 || riskFactor !== 1.0) {
            // Apply E and W adjustment
            weights.E0 = clamp(weights.E0 * adjustmentFactor, 0.1, 1.0);
            weights.W0 = clamp(weights.W0 * adjustmentFactor, 0.1, 1.0);

            // Apply R adjustment
            weights.R0 = clamp(weights.R0 * riskFactor, 0.1, 0.9);

            adjustments[source] = {
                E: weights.E0 - originalWeights.E0,
                W: weights.W0 - originalWeights.W0,
                R: weights.R0 - originalWeights.R0
            };
        }
    }

    return { newWeights, adjustments, stats: sourceGroups };
}

function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}
