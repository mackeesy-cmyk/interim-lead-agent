
import fetch from 'node-fetch';

async function testBrregUpdates() {
    console.log('--- Testing Brønnøysund Update Endpoints (Part 2) ---');

    const headers = {
        'Accept': 'application/json'
    };

    try {
        console.log('\nFetching recent Role Updates (/oppdateringer/roller) again...');
        // Let's get "page 0" explicitly if possible or just inspect the array we get back
        const roleResp = await fetch('https://data.brreg.no/enhetsregisteret/api/oppdateringer/roller?size=3', { headers });

        if (roleResp.ok) {
            const roleData = await roleResp.json();

            // Check if it IS an array or has _embedded
            if (Array.isArray(roleData._embedded?.oppdaterteRoller)) {
                console.log('Found embedded.oppdaterteRoller!');
                roleData._embedded.oppdaterteRoller.forEach(r => {
                    console.log(JSON.stringify(r, null, 2));
                });
            } else if (Array.isArray(roleData)) {
                console.log('Returned direct array! Sample:');
                console.log(JSON.stringify(roleData[0], null, 2));
            } else {
                console.log('Unknown structure. Keys:', Object.keys(roleData));
                if (roleData._embedded) {
                    console.log('Embedded keys:', Object.keys(roleData._embedded));
                    console.log('Sample embedded:', JSON.stringify(roleData._embedded, null, 2));
                }
            }
        } else {
            console.log(`❌ Failed: ${roleResp.status} ${roleResp.statusText}`);
        }

    } catch (e) {
        console.error('Script failed:', e);
    }
}

testBrregUpdates();
