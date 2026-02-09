import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function testManualCreate() {
    try {
        console.log('Attempting to manually create a CaseFile with why_now_text...');
        const record = await caseFiles.create([
            {
                fields: {
                    company_name: "Manual Verification Corp",
                    org_number: "123456789",
                    status: "qualified",
                    why_now_text: "This is a test of the why_now_text persistence logic.",
                    created_at: new Date().toISOString(),
                    qualified_at: new Date().toISOString()
                } as any
            }
        ]);

        console.log(`✅ Record created successfully with ID: ${record[0].id}`);
        console.log('Verifying content...');
        const fetched = await caseFiles.find(record[0].id);
        console.log('Fetched why_now_text:', fetched.get('why_now_text'));

    } catch (error: any) {
        console.error('Manual create failed:', error.message);
    }
}

testManualCreate();
