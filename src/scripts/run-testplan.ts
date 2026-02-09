import dotenv from 'dotenv';
import path from 'path';
import { NextRequest } from 'next/server';

// 1. Load Environment Variables (Must be before other imports)
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

if (!process.env.CRON_SECRET) {
    console.warn('⚠️ CRON_SECRET missing from .env.local, auth might fail.');
}

async function runTests() {
    // 2. Dynamic Imports (to avoid hoisting issues with env.ts)
    const { GET: collectSeeds } = await import('@/app/api/cron/collect-seeds/route');
    const { POST: processEsl } = await import('@/app/api/process-esl/route');
    // Removed LinkedIn import as we are not injecting fake data anymore

    // Request Helper (programmatic request creation)
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

    console.log('🚀 Starting Test Plan Execution (Real-World Data Only)');
    console.log('------------------------------------------------');

    // TEST 3.1: P0 Sources (Collect Seeds)
    console.log('\n[Test 3.1] P0 Sources (Collect Seeds - Limit 5)');
    try {
        const req = createRequest('http://localhost:3000/api/cron/collect-seeds?limit=5', 'GET');
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
                credits_used: data.firecrawl?.credits_used
            });
            console.log('✅ Test 3.1 Passed: Seed collection ran successfully (REAL DATA).');
        } else {
            console.error('❌ Test 3.1 Failed:', data);
        }
    } catch (e) {
        console.error('❌ Test 3.1 Exception:', e);
    }

    // TEST 3.2: ESL+ Scoring & Veto (Test Mode)
    // Runs on REAL pending seeds in Airtable (collected in step 3.1 or previous runs)
    console.log('\n[Test 3.2] ESL+ Scoring & Veto (Test Mode)');
    try {
        const req = createRequest('http://localhost:3000/api/process-esl?mode=test', 'POST');
        const res = await processEsl(req);
        const data = await res.json();
        console.log('Status:', res.status);

        if (res.status === 200) {
            console.log(`Processed: ${data.processed}, Qualified: ${data.qualified}, Dropped: ${data.dropped}`);

            if (data.leads && data.leads.length > 0) {
                const lead = data.leads[0];
                console.log('Sample Lead (REAL):', {
                    company: lead.company_name,
                    C: lead.C,
                    stars: lead.stars,
                    reasoning: lead.reasoning ? 'Present' : 'Missing'
                });

                if (lead.C !== undefined && lead.reasoning) {
                    console.log('✅ Test 3.2 Passed: Full structure present in Test Mode.');
                } else {
                    console.error('❌ Test 3.2 Failed: Missing C score or reasoning.');
                }
            } else {
                console.log('ℹ️ Test 3.2: No seeds qualified in this batch (Normal for real data).');
                if (data.processed > 0) {
                    console.log('✅ Test 3.2 Passed: Processing ran successfully (even if 0 qualified).');
                } else {
                    console.log('⚠️ Test 3.2: No pending seeds found to process.');
                }
            }
        } else {
            console.error('❌ Test 3.2 Failed:', data);
        }
    } catch (e) {
        console.error('❌ Test 3.2 Exception:', e);
    }

    // Note: Test 3.3 (Production Output) is removed from this automated run to avoid consuming 
    // real leads/tokens twice or dealing with state changes. Test 3.2 is sufficient to verify scoring.
    // If you want to verify production output, simply curl the endpoint manually.

    console.log('\n------------------------------------------------');
    console.log('🏁 Test Plan Execution Finished');
}

runTests().catch(console.error);
