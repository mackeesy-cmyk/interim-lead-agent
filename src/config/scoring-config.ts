import fs from 'fs';
import path from 'path';

// Define the scoring weights interface
export interface ScoreWeights {
    E0: number;
    W0: number;
    R0: number;
}

export type ScoringConfig = Record<string, ScoreWeights>;

// Phase 7: Equalized source weights - all sources treated equally
// Brreg used only for location verification, not as stronger signal
const DEFAULT_SCORES: ScoringConfig = {
    // All sources get same baseline weights - let Gemini quality scoring decide
    bronnysund: { E0: 0.5, W0: 0.4, R0: 0.3 },
    brreg_status_update: { E0: 0.5, W0: 0.4, R0: 0.3 },
    brreg_role_change: { E0: 0.5, W0: 0.4, R0: 0.3 },
    brreg_kunngjoringer: { E0: 0.5, W0: 0.4, R0: 0.3 },
    newsweb: { E0: 0.5, W0: 0.4, R0: 0.3 },
    mynewsdesk: { E0: 0.5, W0: 0.4, R0: 0.3 },
    dn_rss: { E0: 0.5, W0: 0.4, R0: 0.3 },
    e24: { E0: 0.5, W0: 0.4, R0: 0.3 },
    finansavisen: { E0: 0.5, W0: 0.4, R0: 0.3 },
    ntb: { E0: 0.5, W0: 0.4, R0: 0.3 },
    rett24_rss: { E0: 0.5, W0: 0.4, R0: 0.3 },
    digi_rss: { E0: 0.5, W0: 0.4, R0: 0.3 },
    finn: { E0: 0.5, W0: 0.4, R0: 0.3 },
    linkedin_exec_move: { E0: 0.5, W0: 0.4, R0: 0.3 },
    linkedin_company_signal: { E0: 0.5, W0: 0.4, R0: 0.3 },
    default: { E0: 0.5, W0: 0.4, R0: 0.3 },
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
