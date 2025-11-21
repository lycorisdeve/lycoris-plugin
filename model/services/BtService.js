
import axios from 'axios';

class BtProvider {
    constructor(name) {
        this.name = name;
    }

    async search(keyword) {
        throw new Error('Method not implemented');
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

class ApibayProvider extends BtProvider {
    constructor() {
        super('Apibay');
    }

    async search(keyword) {
        try {
            const url = `https://apibay.org/q.php?q=${encodeURIComponent(keyword)}`;
            const response = await axios.get(url, { timeout: 10000 });
            const data = response.data;

            if (!Array.isArray(data) || (data.length === 1 && data[0].name === 'No results returned')) {
                return [];
            }

            return data.map(item => ({
                name: item.name,
                magnet: `magnet:?xt=urn:btih:${item.info_hash}`,
                time: new Date(parseInt(item.added) * 1000).toLocaleString(),
                type: item.category,
                size: this.formatSize(parseInt(item.size)),
                source: this.name
            }));
        } catch (err) {
            logger.error(`[${this.name}] Search failed: ${err.message}`);
            return [];
        }
    }
}

const providers = [
    new ApibayProvider()
];

/**
 * Search for torrents using multiple providers
 * @param {string} keyword - The search keyword
 * @returns {Promise<Array<{name: string, magnet: string, time: string, type: string, size: string, source: string}>>}
 */
export async function btApi(keyword) {
    let allResults = [];
    
    // Execute all providers in parallel
    const promises = providers.map(p => p.search(keyword));
    const results = await Promise.allSettled(promises);

    for (const result of results) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            allResults = allResults.concat(result.value);
        }
    }

    return allResults;
}