/**
 * Enrich a specific CaseFile by scraping full article and regenerating analysis
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';
import { CachedBrregLookup } from '../lib/bronnysund';

// NOTE: firecrawl imported dynamically after env vars loaded

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function enrichCaseFile(companyName: string) {
    const caseFiles = base('CaseFiles');
    const seeds = base('Seeds');

    console.log(`🔍 Finding CaseFile for: ${companyName}\n`);

    // Find the CaseFile
    const records = await caseFiles
        .select({
            filterByFormula: `{company_name} = "${companyName}"`,
            maxRecords: 1,
        })
        .firstPage();

    if (records.length === 0) {
        console.log('❌ CaseFile not found');
        return;
    }

    const caseFile = records[0];
    const fields = caseFile.fields as any;

    console.log('📄 Current CaseFile:');
    console.log(`   Company: ${fields.company_name}`);
    console.log(`   Org: ${fields.org_number}`);
    console.log(`   Quality Score: ${fields.quality_score || 0}/100`);
    console.log(`   Source Type: ${fields.source_type}`);
    console.log(`   Case Summary Length: ${(fields.case_summary || '').length} chars`);
    console.log(`\n📝 Current Situasjonsanalyse:`);
    console.log(`   ${fields.situasjonsanalyse || 'N/A'}`);
    console.log(`\n🎯 Current Strategisk Begrunnelse:`);
    console.log(`   ${fields.strategisk_begrunnelse || 'N/A'}\n`);

    // Find the original seed to get source_url
    console.log('🔍 Finding original seed...\n');

    const seedRecords = await seeds
        .select({
            filterByFormula: `AND({company_name} = "${companyName}", {source_type} = "${fields.source_type}")`,
            maxRecords: 1,
        })
        .firstPage();

    if (seedRecords.length === 0) {
        console.log('⚠️  Original seed not found, cannot scrape source article');
        return;
    }

    const seed = seedRecords[0];
    const sourceUrl = (seed.fields as any).source_url;

    if (!sourceUrl) {
        console.log('⚠️  No source_url in seed, cannot scrape');
        return;
    }

    console.log(`📰 Source URL: ${sourceUrl}\n`);

    // Check if URL is scrapeable (not a listing page)
    if (
        sourceUrl.includes('newsweb.no/t/') ||
        sourceUrl.includes('live.euronext.com') ||
        sourceUrl.includes('/api/')
    ) {
        console.log('⚠️  URL is a listing page, skipping Firecrawl scrape');
        return;
    }

    console.log('🔥 Scraping full article with Firecrawl...\n');

    const { scrapeUrl } = await import('../lib/firecrawl');
    const scrapeResult = await scrapeUrl(sourceUrl);

    if (!scrapeResult.success || !scrapeResult.content) {
        console.log(`❌ Scrape failed: ${scrapeResult.error}`);
        return;
    }

    const fullArticle = scrapeResult.content.slice(0, 3000);
    console.log(`✅ Scraped ${scrapeResult.content.length} chars (using first 3000)\n`);

    // Get company data
    const brregCache = new CachedBrregLookup();
    const companyData = await brregCache.batchLookup([fields.org_number]);
    const company = companyData.get(fields.org_number) || null;

    // Prepare enhanced content
    const enhancedContent = `${fields.case_summary || ''}\n\nFULL ARTIKKEL:\n${fullArticle}`;

    // Regenerate structured analysis with full context
    console.log('🤖 Regenerating structured analysis with full article context...\n');

    const { generateStructuredAnalysisBatch } = await import('../lib/gemini');

    const scoredCase = {
        seed: {
            raw_content: enhancedContent,
            source_type: fields.source_type,
            trigger_type: fields.trigger_hypothesis,
            excerpt: fields.case_summary || '',
        },
        company_name: fields.company_name,
        org_number: fields.org_number,
        E: fields.E || 0.5,
        W: fields.W || 0.4,
        V: fields.V || 1,
        R: fields.R || 0.3,
        brreg_data: company,
    };

    const analysis = await generateStructuredAnalysisBatch([scoredCase as any]);
    const newAnalysis = analysis.get(fields.org_number);

    if (!newAnalysis) {
        console.log('❌ Failed to generate new analysis');
        return;
    }

    console.log('✅ New analysis generated!\n');
    console.log('📝 NEW Situasjonsanalyse:');
    console.log(`   ${newAnalysis.situasjonsanalyse}\n`);
    console.log('🎯 NEW Strategisk Begrunnelse:');
    console.log(`   ${newAnalysis.strategisk_begrunnelse}\n`);
    console.log(`📊 NEW Quality Score: ${newAnalysis.quality_score}/100\n`);

    // Ask for confirmation
    console.log('⚠️  Update CaseFile with new analysis?');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Update Airtable
    await caseFiles.update(caseFile.id, {
        case_summary: enhancedContent.slice(0, 1000), // Update with enhanced content
        situasjonsanalyse: newAnalysis.situasjonsanalyse,
        strategisk_begrunnelse: newAnalysis.strategisk_begrunnelse,
        quality_score: newAnalysis.quality_score,
        rejection_reason: newAnalysis.quality_score < 60 ? newAnalysis.rejection_reason : undefined,
    });

    console.log('✅ CaseFile updated successfully!');
}

const companyName = process.argv[2];

if (!companyName) {
    console.log('Usage: npx tsx src/scripts/enrich-casefile.ts "Company Name"');
    process.exit(1);
}

enrichCaseFile(companyName).catch(console.error);
