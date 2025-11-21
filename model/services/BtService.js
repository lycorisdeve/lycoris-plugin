
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
 * Search for torrents using Sukebei
 * @param {string} keyword - The search keyword
 * @returns {Promise<Array<{name: string, magnet: string, time: string, type: string, size: string, source: string}>>}
 */
export async function btApi(keyword) {
    return await searchSukebei(keyword);
}