
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Format bytes to human readable string
 * @param {number} bytes 
 * @returns {string}
 */
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Search Sukebei Nyaa (RSS)
 * @param {string} keyword 
 * @returns {Promise<Array>}
 */
async function searchSukebei(keyword) {
    try {
        const url = `https://sukebei.nyaa.si/?page=rss&q=${encodeURIComponent(keyword)}`;
        const response = await axios.get(url, { timeout: 10000 });
        const $ = cheerio.load(response.data, { xmlMode: true });
        
        const results = [];
        $('item').each((i, elem) => {
            const title = $(elem).find('title').text();
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
                    source: 'Sukebei'
                });
            }
        });
        return results;
    } catch (err) {
        // logger.debug(`[Sukebei] Search failed: ${err.message}`);
        return [];
    }
}

/**
 * Search Apibay (Backup)
 * @param {string} keyword 
 * @returns {Promise<Array>}
 */
async function searchApibay(keyword) {
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
            size: formatSize(parseInt(item.size)),
            source: 'Apibay'
        }));
    } catch (err) {
        logger.error(`[Apibay] Search failed: ${err.message}`);
        return [];
    }
}

/**
 * Search for torrents using Sukebei first, then Apibay as backup
 * @param {string} keyword - The search keyword
 * @returns {Promise<Array<{name: string, magnet: string, time: string, type: string, size: string, source: string}>>}
 */
export async function btApi(keyword) {
    // Try Sukebei first
    let results = await searchSukebei(keyword);
    if (results && results.length > 0) {
        return results;
    }

    // Fallback to Apibay
    results = await searchApibay(keyword);
    return results;
}