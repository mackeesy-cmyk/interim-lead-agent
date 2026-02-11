/**
 * Check what fields actually exist in CaseFiles table
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
);

async function checkCaseFileSchema() {
    const caseFiles = base('CaseFiles');

    console.log('🔍 Checking CaseFiles schema...\n');

    const records = await caseFiles
        .select({ maxRecords: 1 })
        .firstPage();

    if (records.length === 0) {
        console.log('No records found in CaseFiles');
        return;
    }

    const firstRecord = records[0];
    console.log('📄 First CaseFile record:');
    console.log(`   ID: ${firstRecord.id}`);
    console.log('\n📋 Available fields:');

    const fields = firstRecord.fields;
    Object.keys(fields).sort().forEach(key => {
        const value = (fields as any)[key];
        const type = typeof value;
        const preview = type === 'string' && value.length > 50
            ? value.substring(0, 50) + '...'
            : value;
        console.log(`   ${key}: ${type} = ${preview}`);
    });

    console.log('\n🔍 Checking for Phase 6 required fields:');
    const requiredFields = ['situasjonsanalyse', 'strategisk_begrunnelse', 'quality_score', 'rejection_reason'];
    requiredFields.forEach(field => {
        const exists = field in fields;
        const status = exists ? '✅ EXISTS' : '❌ MISSING';
        console.log(`   ${field}: ${status}`);
    });
}

checkCaseFileSchema().catch(console.error);
