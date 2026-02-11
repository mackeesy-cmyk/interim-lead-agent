import dotenv from 'dotenv';
import path from 'path';
import { NextRequest } from 'next/server';

// 1. Load Environment Variables
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function runProductionBatch() {
    const { GET: collectSeeds } = await import('@/app/api/cron/collect-seeds/route');
    const { POST: processEsl } = await import('@/app/api/process-esl/route');

    function createRequest(url: string, method: 'GET' | 'POST' = 'GET', body?: any): NextRequest {
        const init: RequestInit = {
            method,
            headers: {
                'authorization': `Bearer ${process.env.CRON_SECRET}`,
                'content-type': 'application/json',
            },
        };
        if (body) {
            init.body = JSON.stringify(body);
        }
        return new NextRequest(new URL(url, 'http://localhost:3000'), init as any);
    }

    console.log('🚀 Starting FULL PRODUCTION BATCH');
    console.log('------------------------------------------------');

    // STEP 1: Full Seed Collection
    console.log('\n[Step 1] Full Seed Collection (Limit 50)');
    try {
        const req = createRequest('http://localhost:3000/api/cron/collect-seeds?limit=50', 'GET');
        const res = await collectSeeds(req);
        const data = await res.json();

        console.log('Status:', res.status);
        if (res.status === 200) {
            console.log('Results:', {
                bronnysund: data.bronnysund_seeds,
                updates: data.brreg_updates_seeds,
                kunngjoringer: data.brreg_kunngjoringer_seeds,
                rss: data.rss_seeds,
                firecrawl: data.firecrawl_seeds,
                message: data.message
            });
            console.log('✅ Step 1 Completed: Seeds collected.');
        } else {
            console.error('❌ Step 1 Failed:', data);
        }
    } catch (e) {
        console.error('❌ Step 1 Exception:', e);
    }

    // STEP 2: Production ESL+ Processing
    console.log('\n[Step 2] Production ESL+ Processing (Writing to Airtable)');
    try {
        const req = createRequest('http://localhost:3000/api/process-esl?mode=production', 'POST');
        const res = await processEsl(req);
        const data = await res.json();
        console.log('Status:', res.status);

        if (res.status === 200) {
            console.log(`Qualified: ${data.qualified}, Dropped: ${data.dropped}`);
            if (data.leads && data.leads.length > 0) {
                console.log('Top Leads identified:');
                data.leads.forEach((l: any, i: number) => {
                    console.log(`${i + 1}. ${l.company_name} - Stars: ${l.stars}`);
                });
            }
            console.log('✅ Step 2 Completed: Processing finished.');
        } else {
            console.error('❌ Step 2 Failed:', data);
        }
    } catch (e) {
        console.error('❌ Step 2 Exception:', e);
    }

    console.log('\n------------------------------------------------');
    console.log('🏁 Full Batch Execution Finished');
}

runProductionBatch().catch(console.error);
