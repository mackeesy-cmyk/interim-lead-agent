export type LogMode = 'test' | 'production';

export interface LogContext {
    mode: LogMode;
    component: string;
    [key: string]: any;
}

/**
 * Structured logger that behaves differently based on mode.
 * Addendum §7:
 * - Test mode: Log all assessments, scorings, vetoes.
 * - Production mode: Log only technical errors and aggregate stats.
 */
export const logger = {
    info: (message: string, context?: LogContext, data?: any) => {
        if (context?.mode === 'test') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [INFO] [${context.component}] ${message}`, data ? data : '');
        } else {
            // In production, we only log high-level info if strictly necessary, 
            // but the addendum says "only technical errors and aggregate stats".
            // So we skip detailed info logs in production.
            if (context?.forceProdLog) {
                console.log(`[INFO] ${message}`);
            }
        }
    },

    warn: (message: string, context?: LogContext, data?: any) => {
        // Warnings are usually relevant in both, but maybe filtered in prod?
        // Addendum implies strictly limiting production logs.
        if (context?.mode === 'test') {
            console.warn(`[WARN] [${context?.component}] ${message}`, data ? data : '');
        }
    },

    error: (message: string, error?: any, context?: LogContext) => {
        // Always log errors
        console.error(`[ERROR] ${message}`, error);
    },

    // Special method for aggregate stats (allowed in prod)
    stat: (message: string, stats: any) => {
        console.log(`[STAT] ${message}`, stats);
    },

    // Special method for audit trail (test mode only)
    audit: (message: string, context: LogContext) => {
        if (context.mode === 'test') {
            console.log(`[AUDIT] ${message}`);
        }
    }
};
