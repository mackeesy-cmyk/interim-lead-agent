/**
 * Check qualified leads in CaseFiles
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function checkQualifiedLeads() {
    const caseFiles = base('CaseFiles');
    const allCases: any[] = [];

    console.log('🔍 Fetching CaseFiles...\n');

    await caseFiles
        .select({ maxRecords: 100 })
        .eachPage((records, fetchNextPage) => {
            allCases.push(...records);
            fetchNextPage();
        });

    console.log(`📊 Total CaseFiles: ${allCases.length}\n`);

    // Group by status
    const byStatus: Record<string, any[]> = {};
    allCases.forEach(c => {
        const status = c.fields.status || 'unknown';
        if (!byStatus[status]) byStatus[status] = [];
        byStatus[status].push(c);
    });

    console.log('📋 CaseFiles by status:');
    Object.entries(byStatus).forEach(([status, cases]) => {
        console.log(`   ${status}: ${cases.length}`);
    });

    // Show qualified leads
    const qualified = byStatus.qualified || [];
    if (qualified.length > 0) {
        console.log(`\n✅ QUALIFIED LEADS (${qualified.length}):\n`);
        console.log('═'.repeat(80));

        qualified
            .sort((a, b) => (b.fields.stars || 0) - (a.fields.stars || 0))
            .forEach((lead, i) => {
                const f = lead.fields;
                const stars = '⭐'.repeat(f.stars || 0);
                const score = f.quality_score || 0;
                const C = f.C || 0;

                console.log(`\n${i + 1}. ${f.company_name} ${stars}`);
                console.log(`   📍 Org: ${f.org_number || 'N/A'} | Location: ${f.is_ostlandet ? 'Østlandet ✅' : 'Outside ❌'}`);
                console.log(`   📊 C-score: ${C.toFixed(2)} | Quality: ${score}/100`);
                console.log(`   🎯 Trigger: ${f.trigger_hypothesis || 'N/A'}`);
                console.log(`   💼 Role: ${f.suggested_role || 'N/A'}`);
                console.log(`   📰 Source: ${f.source_type || 'N/A'}`);

                if (f.situasjonsanalyse) {
                    console.log(`   📝 Situasjon: ${f.situasjonsanalyse.substring(0, 120)}...`);
                }

                if (f.strategisk_begrunnelse) {
                    console.log(`   🎯 Strategi: ${f.strategisk_begrunnelse.substring(0, 120)}...`);
                }
            });

        console.log('\n' + '═'.repeat(80));
    }

    // Show dropped leads
    const dropped = byStatus.dropped || [];
    if (dropped.length > 0) {
        console.log(`\n\n❌ DROPPED LEADS (${dropped.length}):\n`);

        dropped.slice(0, 5).forEach((lead, i) => {
            const f = lead.fields;
            const score = f.quality_score || 0;
            console.log(`${i + 1}. ${f.company_name}`);
            console.log(`   Quality: ${score}/100 | Reason: ${f.rejection_reason || 'N/A'}`);
        });

        if (dropped.length > 5) {
            console.log(`   ... and ${dropped.length - 5} more`);
        }
    }
}

checkQualifiedLeads().catch(console.error);
