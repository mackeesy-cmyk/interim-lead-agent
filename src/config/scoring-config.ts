import fs from 'fs';
import path from 'path';

// Define the scoring weights interface
export interface ScoreWeights {
    E0: number;
    W0: number;
    R0: number;
}

export type ScoringConfig = Record<string, ScoreWeights>;

// Default weights from Addendum v1.0
const DEFAULT_SCORES: ScoringConfig = {
    bronnysund: { E0: 0.8, W0: 0.7, R0: 0.1 },
    brreg_status_update: { E0: 0.85, W0: 0.75, R0: 0.1 },
    brreg_role_change: { E0: 0.80, W0: 0.70, R0: 0.15 },
    brreg_kunngjoringer: { E0: 0.7, W0: 0.6, R0: 0.1 },
    // News sources - Tuned for higher sensitivity (Feb 9)
    // Goal: Base C around 0.55-0.65 to allow Gemini to qualify good leads
    newsweb: { E0: 0.7, W0: 0.6, R0: 0.1 },        // High confidence source
    mynewsdesk: { E0: 0.6, W0: 0.5, R0: 0.2 },     // Medium confidence

    // RSS Feeds - Raised from 0.40 baseline to ~0.55 baseline
    dn_rss: { E0: 0.6, W0: 0.4, R0: 0.2 },         // Major financial news
    e24: { E0: 0.6, W0: 0.4, R0: 0.2 },            // Major financial news
    finansavisen: { E0: 0.6, W0: 0.4, R0: 0.2 },   // Major financial news
    ntb: { E0: 0.5, W0: 0.4, R0: 0.3 },            // Wire service (broader)

    finn: { E0: 0.3, W0: 0.3, R0: 0.5 },
    linkedin_exec_move: { E0: 0.5, W0: 0.5, R0: 0.3 },
    linkedin_company_signal: { E0: 0.4, W0: 0.4, R0: 0.4 },
    default: { E0: 0.4, W0: 0.4, R0: 0.3 },
};

const STATE_FILE_PATH = path.join(process.cwd(), 'src/config/scoring-state.json');

/**
 * Get current scoring weights.
 * Reads from scoring-state.json if it exists, otherwise returns defaults.
 */
export function getScoringWeights(): ScoringConfig {
    if (fs.existsSync(STATE_FILE_PATH)) {
        try {
            const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
            return JSON.parse(raw) as ScoringConfig;
        } catch (error) {
            console.error('Failed to read scoring-state.json, using defaults', error);
        }
    }
    return JSON.parse(JSON.stringify(DEFAULT_SCORES)); // Return deep copy
}

/**
 * Update scoring weights and persist to disk.
 */
export function updateScoringWeights(newWeights: ScoringConfig): void {
    try {
        // Ensure directory exists
        const dir = path.dirname(STATE_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(newWeights, null, 2));
        console.log('✅ Scoring weights updated and saved to scoring-state.json');
    } catch (error) {
        console.error('Failed to save scoring weights:', error);
        throw error;
    }
}

/**
 * Reset weights to defaults (useful for rollback)
 */
export function resetScoringWeights(): void {
    updateScoringWeights(DEFAULT_SCORES);
}
