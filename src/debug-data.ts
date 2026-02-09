import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const caseFiles = base('CaseFiles');

async function test() {
    try {
        console.log('Querying CaseFiles records...');
        const records = await caseFiles.select({
            maxRecords: 10,
        }).all();
        console.log(`Found ${records.length} records in CaseFiles.`);

        if (records.length > 0) {
            records.forEach((r, i) => {
                const fields = Object.keys(r.fields);
                console.log(`\nRecord ${i + 1} (${r.id}):`);
                console.log(`  Fields: [${fields.join(', ')}]`);

                const companyName = r.get('company_name');
                if (companyName) {
                    console.log(`  Name: ${companyName}`);
                }

                const whyNow = r.get('why_now_text');
                if (whyNow) {
                    console.log(`  WhyNow (raw): ${JSON.stringify(whyNow)}`);
                    if (typeof whyNow === 'string') {
                        console.log(`  WhyNow (sliced): ${whyNow.slice(0, 50)}...`);
                    }
                } else {
                    console.log(`  WhyNow: MISSING/NULL`);
                }
            });
        }
    } catch (error: any) {
        console.error('Data query failed:', error.message);
    }
}

test();
