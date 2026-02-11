
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
];

async function test() {
    for (const modelName of models) {
        console.log(`Testing model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            console.log(`✅ ${modelName} works! Response: ${result.response.text()}`);
            break;
        } catch (e: any) {
            console.log(`❌ ${modelName} failed: ${e.status || e.message}`);
        }
    }
}

test();
