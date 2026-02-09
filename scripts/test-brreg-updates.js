
import fetch from 'node-fetch';

async function testBrregUpdates() {
    console.log('--- Testing Brønnøysund Update Endpoints ---');

    // Mime-type logic might be needed for the new API, checking defaults first
    const headers = {
        'Accept': 'application/json' // or 'application/vnd.brreg.enhetsregisteret.oppdatering.v1+json'
    };

    try {
        // 1. Check for recent entity updates
        console.log('\n1. Fetching recent Entity Updates (/oppdateringer/enheter)...');
        const entityResp = await fetch('https://data.brreg.no/enhetsregisteret/api/oppdateringer/enheter?size=5', { headers });

        if (entityResp.ok) {
            const data = await entityResp.json();
            console.log(`✅ Success! Found ${data._embedded?.oppdaterteEnheter?.length || 0} updates.`);
            if (data._embedded?.oppdaterteEnheter?.length > 0) {
                console.log('Sample update:', JSON.stringify(data._embedded.oppdaterteEnheter[0], null, 2));
            }
        } else {
            console.log(`❌ Failed: ${entityResp.status} ${entityResp.statusText}`);
            console.log(await entityResp.text());
        }

        // 2. Check for recent Role updates (CRITICAL for interim)
        // Note: The documentation url for this might vary slightly, usually it is under /enhetsregisteret/api/oppdateringer/underenheter 
        // OR it might be a different base path. Let's try the one from the image implies /oppdateringer/roller is not there, 
        // but /api/roller/rolletyper is. 
        // Wait, the image showed /api/oppdateringer/roller in the list? 
        // Looking at the first image again... 
        // "GET /api/oppdateringer/roller -> Hent rolleoppdateringer" - YES it was there in the first image.

        console.log('\n2. Fetching recent Role Updates (/oppdateringer/roller)...');
        // This endpoint often requires specific headers or might be restricted.
        const roleResp = await fetch('https://data.brreg.no/enhetsregisteret/api/oppdateringer/roller?size=5', { headers });

        if (roleResp.ok) {
            const roleData = await roleResp.json();
            console.log(`✅ Success! Request to /oppdateringer/roller worked.`);
            // note: data structure might be inside _embedded
            console.log('Response keys:', Object.keys(roleData));
            if (roleData._embedded) {
                console.log('Sample role update:', JSON.stringify(roleData._embedded, null, 2)); // dump structure
            }
        } else {
            console.log(`❌ Failed: ${roleResp.status} ${roleResp.statusText}`);
        }

    } catch (e) {
        console.error('Script failed:', e);
    }
}

testBrregUpdates();
