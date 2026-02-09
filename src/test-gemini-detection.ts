import { detectTriggers } from './lib/gemini';

async function test() {
    const text = "Schibsted: Anders Sooth Knutsen konstitueres som nyhetsredaktør i VG. Han overtar etter Olav T. Sandnes.";
    const result = await detectTriggers(text, 'news_article', 'NTB');
    console.log(JSON.stringify(result, null, 2));
}

test();
