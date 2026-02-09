const REQUIRED_VARS = [
  'GEMINI_API_KEY',
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'FIRECRAWL_API_KEY',
  'RESEND_API_KEY',
  'REPORT_RECIPIENT_EMAIL',
  'CRON_SECRET',
] as const;

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
    `Check your .env.local file.`
  );
}

// Export to make this a proper module
export const envValidated = true;
