import 'dotenv/config';
import axios from 'axios';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function listTables() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
            {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                },
            }
        );
        console.log('Tables in base:');
        response.data.tables.forEach((t: any) => {
            console.log(`- ${t.name} (ID: ${t.id})`);
            if (t.name === 'CaseFiles') {
                console.log('  Fields in CaseFiles:');
                t.fields.forEach((f: any) => console.log(`    - ${f.name} (${f.type})`));
            }
        });
    } catch (error: any) {
        console.error('Failed to list tables:', error.response?.data || error.message);
    }
}

listTables();
