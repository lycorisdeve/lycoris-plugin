
import { btApi } from './model/services/BtService.js';

async function test() {
    console.log('Testing btApi with keyword "ubuntu"...');
    const results = await btApi('ubuntu');
    console.log(`Found ${results.length} results.`);
    
    if (results.length > 0) {
        const sources = [...new Set(results.map(r => r.source))];
        console.log('Sources found:', sources);
        console.log('First result:', results[0]);
    } else {
        console.log('No results found.');
    }
}

test();
