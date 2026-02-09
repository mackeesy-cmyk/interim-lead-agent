# Deploying to Vercel

Since your project is a Next.js application designed with Vercel Cron jobs in mind, **Vercel is the recommended hosting platform**.

## Why Vercel?
1. **Native Cron Support**: The `vercel.json` file I updated automatically configures the scheduled tasks (Feedback, Collection, Scoring, Reporting).
2. **Serverless**: No need to manage Docker containers or servers.
3. **Integrated Logging**: View logs for each function execution in real-time.
4. **Environment Variables**: Easy management of your API keys.

## Deployment Steps

### 1. Push to GitHub
Ensure your code is pushed to a GitHub repository.

### 2. Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository.

### 3. Configure Environment Variables
In the Vercel project settings, add the following variables (copy from your `.env.local`):

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key |
| `AIRTABLE_API_KEY` | Airtable Personal Access Token |
| `AIRTABLE_BASE_ID` | Airtable Base ID |
| `FIRECRAWL_API_KEY` | Firecrawl API Key |
| `RESEND_API_KEY` | Resend API Key |
| `CRON_SECRET` | **Important**: Generate a strong internal secret (e.g., UUID) |

> **Note**: The `CRON_SECRET` is used to secure your cron jobs. Vercel automatically sends this as a Bearer token when triggering your tasks.

### 4. Deploy
Click **Deploy**. Vercel will build your project and start the cron jobs according to the schedule in `vercel.json`.

## Schedule Overview (CET)
- **Monday 04:00**: `process-feedback` (Adjust scoring weights)
- **Mon-Fri 05:00**: `collect-seeds` (Gather new leads daily)
- **Mon-Fri 06:00**: `process-esl` (Score and qualify unprocessed leads)
- **Monday 07:30**: `generate-report` (Email weekly report of all qualified leads)

## Maintenance
- **Logs**: Check the "Logs" tab in Vercel to inspect cron execution.
- **Manual Runs**: You can manually trigger cron jobs from the Vercel dashboard Settings -> Cron Jobs.
