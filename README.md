# Interim Lead Agent

AI-powered system for identifying Norwegian companies needing interim leadership.

## Architecture

- **Orchestration**: Antigravity workflows
- **Storage**: Airtable
- **Scraping**: Firecrawl
- **LLM**: Gemini Flash (fast) + Claude Sonnet (quality)
- **Hosting**: Vercel (cron + API)
- **Email**: Resend

## Setup

### 1. Airtable

Import the schema from `docs/airtable-schema.md` or use the Airtable template link.

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
GEMINI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
AIRTABLE_API_KEY=your_key
AIRTABLE_BASE_ID=your_base_id
FIRECRAWL_API_KEY=your_key
RESEND_API_KEY=your_key
```

### 3. Deploy to Vercel

```bash
vercel deploy
```

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Seed Collector | Cron (Mon 06:00) | Collect seeds from sources |
| ESL+ Processor | After seeds | Run evidence loop per company |
| Report Generator | Cron (Mon 08:30) | Generate and send email report |

## Development

```bash
npm install
npm run dev
```

## License

Proprietary - Incepto
