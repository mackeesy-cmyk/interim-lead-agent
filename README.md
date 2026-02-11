# 🕵️ Interim Lead Agent

> **Automated AI Discovery & Qualification for Interim Leadership Leads in Norway.**

Interim Lead Agent is a sophisticated automation system designed to identify and qualify companies in the Norwegian market that may require interim leadership. By orchestrating a multi-stage pipeline of data collection, AI analysis, and professional reporting, it transforms raw signals into actionable leads.

![Dashboard Preview](file:///Users/mackeegesen/Desktop/Antigravity/Interim%20leader/interim-lead-agent/Screenshot%202026-02-09%20at%2017.00.25.jpg)

---

## 🚀 Key Features

- **Automated Seed Collection**: Daily harvesting of signals from Brønnøysund registry (status updates, role changes), LinkedIn (executive moves, company signals), and more.
- **ESL+ Scoring Logic**: Advanced Lead Scoring using **Gemini Flash/Pro** and **Firecrawl** to verify signals against live website data and company records.
- **Intelligent Feedback Loop**: Learns from manual lead grading to adjust scoring weights through the `process-feedback` workflow.
- **Professional Reporting**: Beautiful, automated weekly email reports delivered via **Resend**.
- **Robust Orchestration**: Scheduled execution via **Vercel Cron** and Antigravity workflows.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (Serverless API & Cron)
- **AI/LLM**: [Google Gemini](https://ai.google.dev/) (Primary Analysis) & [Claude Sonnet](https://www.anthropic.com/claude) (Quality Control)
- **Data Source**: [Brønnøysund Registry](https://www.brreg.no/) (API lookup)
- **Web Intelligence**: [Firecrawl](https://www.firecrawl.dev/) (Smart scraping & verification)
- **Data Storage**: [Airtable](https://airtable.com/) (CRM & Source of Truth)
- **Communication**: [Resend](https://resend.com/) (Transactional Email)

---

## 🏗️ Getting Started

### Prerequisites

- Node.js 18+
- Airtable Base (see [Airtable Setup](file:///Users/mackeegesen/Desktop/Antigravity/Interim%20leader/interim-lead-agent/AIRTABLE_SETUP.md))
- API Keys for Gemini, Firecrawl, Airtable, and Resend.

### 1. Installation

```bash
git clone ...
cd interim-lead-agent
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and configure your keys:

```bash
GEMINI_API_KEY=your_key
AIRTABLE_API_KEY=your_key
AIRTABLE_BASE_ID=your_base_id
FIRECRAWL_API_KEY=your_key
RESEND_API_KEY=your_key
```

### 3. Local Development

```bash
npm run dev
```

---

## 🔄 Core Workflows (Cron Schedule)

The system operates on a scheduled pipeline to ensure leads are always fresh and qualified.

| Task | Schedule (CET) | Purpose |
| :--- | :--- | :--- |
| **Feedback Processor** | Mon 04:00 | Analyzes manual grading to adjust scoring parameters. |
| **Seed Collector** | Mon-Fri 05:00 | Gathers new signals from Norwegian business registries. |
| **ESL+ Agent** | Mon-Fri 06:00 | Scores companies based on signals and web evidence. |
| **Report Generator** | Mon 07:30 | Sends the weekly summary of high-probability leads. |

---

## 📁 Project Structure

- `/src/app/api`: Serverless functions and Cron endpoints.
- `/src/lib`: Core logic for Airtable, Gemini, Firecrawl, and Scrapers.
- `/src/scripts`: Diagnostic and production batch scripts (see below).
- `/docs`: Detailed schemas and setup guides.

---

## 🧪 Management & Scripts

Run these scripts for manual interventions or testing:

- **Backfill Summaries**: `npx ts-node src/scripts/backfill-summaries.ts`
- **Run Production Batch**: `npx ts-node src/scripts/run-production-batch.ts`
- **Test Plan Verification**: `npx ts-node src/scripts/run-testplan.ts`

---

## 🛳️ Deployment

This project is optimized for **Vercel**. For detailed deployment instructions, including Cron job configuration and `CRON_SECRET` setup, please refer to the **[Deployment Guide](file:///Users/mackeegesen/Desktop/Antigravity/Interim%20leader/interim-lead-agent/DEPLOY.md)**.

---

## ⚖️ License

Proprietary - © **Incepto**
