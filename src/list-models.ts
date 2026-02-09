import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function test() {
    try {
        const models = await (genAI as any).listModels();
        console.log('Available models:');
        for (const m of models.models) {
            console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
        }
    } catch (error) {
        console.error('List models failed:', error);
    }
}

test();
