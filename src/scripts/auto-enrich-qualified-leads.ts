/**
 * Automatically enrich ALL qualified leads with weak content
 * Uses news search + Firecrawl to find and scrape relevant articles
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';
import { CachedBrregLookup } from '../lib/bronnysund';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

const MIN_CONTENT_LENGTH = 200; // Leads with less content need enrichment

async function autoEnrichQualifiedLeads() {
    console.log('🔍 Finding qualified leads with weak content...\n');

    const caseFiles = base('CaseFiles');
    const allRecords: any[] = [];

    await caseFiles
        .select({
            filterByFormula: `{status} = 'qualified'`,
            maxRecords: 100,
        })
        .eachPage((records, fetchNextPage) => {
            allRecords.push(...records);
            fetchNextPage();
        });

    // Filter to those with short case_summary
    const weakContentLeads = allRecords.filter((r) => {
        const summary = r.fields.case_summary || '';
        return summary.length < MIN_CONTENT_LENGTH;
    });

    console.log(`📊 Found ${allRecords.length} qualified leads`);
    console.log(`   ${weakContentLeads.length} have weak content (<${MIN_CONTENT_LENGTH} chars)\n`);

    if (weakContentLeads.length === 0) {
        console.log('✅ All qualified leads have sufficient content!');
        return;
    }

    console.log('🔎 Leads to enrich:');
    weakContentLeads.forEach((lead, i) => {
        const f = lead.fields;
        console.log(`   ${i + 1}. ${f.company_name} (${f.case_summary?.length || 0} chars)`);
    });
    console.log('');

    // Dynamically import after env loaded
    const { searchNewsContext } = await import('../lib/search');
    const { generateStructuredAnalysisBatch } = await import('../lib/gemini');

    const brregCache = new CachedBrregLookup();
    const orgNumbers = weakContentLeads.map((r) => r.fields.org_number).filter(Boolean);
    const companyData = await brregCache.batchLookup(orgNumbers);

    console.log('🔎 Searching for news articles and enriching...\n');

    for (const lead of weakContentLeads) {
        const f = lead.fields;
        console.log(`📰 ${f.company_name}:`);
        console.log(`   Current content: ${f.case_summary?.length || 0} chars`);
        console.log(`   Trigger: ${f.trigger_hypothesis}`);

        // Search for news context
        const newsResult = await searchNewsContext(f.company_name);

        if (!newsResult.hasNews || newsResult.newsContext.length < 100) {
            console.log(`   ⚠️  No relevant news found, skipping`);
            continue;
        }

        console.log(`   ✅ Found news context: ${newsResult.newsContext.length} chars`);

        // Combine original + news context
        const enhancedContent = `${f.case_summary || f.excerpt || ''}\n\nNYHETSKONTEKST:\n${newsResult.newsContext}`;

        // Regenerate analysis with enhanced content
        const company = companyData.get(f.org_number) || null;

        const scoredCase = {
            seed: {
                raw_content: enhancedContent,
                source_type: f.source_type,
                trigger_type: f.trigger_hypothesis,
                excerpt: f.case_summary || '',
            },
            company_name: f.company_name,
            org_number: f.org_number,
            E: f.E || 0.5,
            W: f.W || 0.4,
            V: f.V || 1,
            R: f.R || 0.3,
            brreg_data: company,
        };

        const analysis = await generateStructuredAnalysisBatch([scoredCase as any]);
        const newAnalysis = analysis.get(f.org_number);

        if (!newAnalysis) {
            console.log(`   ⚠️  Failed to regenerate analysis`);
            continue;
        }

        console.log(`   🤖 New quality score: ${newAnalysis.quality_score}/100`);
        console.log(`   📝 Situasjonsanalyse: ${newAnalysis.situasjonsanalyse.substring(0, 80)}...`);
        console.log(`   🎯 Strategi: ${newAnalysis.strategisk_begrunnelse.substring(0, 80)}...`);

        // Update Airtable
        await caseFiles.update(lead.id, {
            case_summary: enhancedContent.slice(0, 2000),
            situasjonsanalyse: newAnalysis.situasjonsanalyse,
            strategisk_begrunnelse: newAnalysis.strategisk_begrunnelse,
            quality_score: newAnalysis.quality_score,
            status: newAnalysis.quality_score >= 60 ? 'qualified' : 'dropped',
            rejection_reason:
                newAnalysis.quality_score < 60 ? newAnalysis.rejection_reason : undefined,
        });

        console.log(`   ✅ Updated\n`);

        // Delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log('\n✅ Auto-enrichment complete!');
}

autoEnrichQualifiedLeads().catch(console.error);
