import 'dotenv/config';
import Airtable from 'airtable';
import { GoogleGenerativeAI } from '@google/generative-ai';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const seedsTable = base('Seeds');
const caseFilesTable = base('CaseFiles');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function forceReprocess() {
    try {
        console.log('Fetching Bilia and Gjensidige seeds...');
        const records = await seedsTable.select({
            filterByFormula: "OR({company_name} = 'Bilia', {company_name} = 'Gjensidige')",
            maxRecords: 2
        }).all();

        if (records.length === 0) {
            console.log('No matching seeds found');
            return;
        }

        console.log(`Processing ${records.length} records...`);

        for (const r of records) {
            const companyName = r.get('company_name');
            const excerpt = r.get('excerpt') || '';

            console.log(`Analyzing ${companyName}...`);
            const prompt = `Analyze this business signal for ${companyName}: "${excerpt}".
            Explain why this is a good opportunity for an interim manager.
            Respond in one short paragraph in Norwegian.`;

            const result = await model.generateContent(prompt);
            const whyNow = result.response.text();

            console.log(`Creating CaseFile for ${companyName}...`);
            await caseFilesTable.create([
                {
                    fields: {
                        company_name: companyName,
                        org_number: r.get('org_number') || '',
                        status: 'qualified',
                        why_now_text: whyNow,
                        created_at: new Date().toISOString(),
                        qualified_at: new Date().toISOString(),
                        E: 0.8,
                        W: 0.8,
                        V: 1,
                        R: 0.1
                    } as any
                }
            ]);
        }

        console.log('✅ Force repopulate successful');
    } catch (error: any) {
        console.error('Force reprocess failed:', error.message);
    }
}

forceReprocess();
