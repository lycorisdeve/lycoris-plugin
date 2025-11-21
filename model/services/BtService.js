
import axios from 'axios';
import * as cheerio from 'cheerio';

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

class SukebeiProvider extends BtProvider {
    constructor() {
        super('Sukebei');
    }

    async search(keyword) {
        try {
            // Use RSS feed for easier parsing
            const url = `https://sukebei.nyaa.si/?page=rss&q=${encodeURIComponent(keyword)}`;
            const response = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(response.data, { xmlMode: true });
            
            const results = [];
            $('item').each((i, elem) => {
                const title = $(elem).find('title').text();
                // Nyaa RSS usually has nyaa:infoHash
                const infoHash = $(elem).find('nyaa\\:infoHash').text() || $(elem).find('infoHash').text();
                const size = $(elem).find('nyaa\\:size').text() || $(elem).find('size').text();
                const pubDate = $(elem).find('pubDate').text();
                const category = $(elem).find('nyaa\\:category').text() || $(elem).find('category').text();
                
                if (infoHash) {
                    results.push({
                        name: title,
                        magnet: `magnet:?xt=urn:btih:${infoHash}`,
                        time: new Date(pubDate).toLocaleString(),
                        type: category,
                        size: size,
                        source: this.name
                    });
                }
            });

            return results;
        } catch (err) {
            // logger.debug(`[${this.name}] Search failed: ${err.message}`);
            return [];
        }
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
    new SukebeiProvider(),
    new ApibayProvider()
];

/**
 * Search for torrents using multiple providers sequentially
 * @param {string} keyword - The search keyword
 * @returns {Promise<Array<{name: string, magnet: string, time: string, type: string, size: string, source: string}>>}
 */
export async function btApi(keyword) {
    for (const provider of providers) {
        try {
            // logger.debug(`Searching with ${provider.name}...`);
            const results = await provider.search(keyword);
            if (results && results.length > 0) {
                return results;
            }
        } catch (err) {
            logger.error(`[${provider.name}] Unexpected error: ${err.message}`);
        }
    }

    return [];
}