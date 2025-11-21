
import axios from 'axios';

/**
 * Search for torrents using apibay.org
 * @param {string} keyword - The search keyword
 * @param {number} page - The page number (not used by apibay in this simple implementation, but kept for signature compatibility)
 * @returns {Promise<Array<{name: string, magnet: string, time: string, type: string, size: string}>>}
 */
export async function btApi(keyword, page = 0) {
    try {
        // apibay.org uses q.php?q=keyword
        // It returns a JSON array
        const url = `https://apibay.org/q.php?q=${encodeURIComponent(keyword)}`;
        const response = await axios.get(url);
        const data = response.data;

        if (!Array.isArray(data) || (data.length === 1 && data[0].name === 'No results returned')) {
            return [];
        }

        // Map apibay format to our expected format
        // apibay returns: { id, name, info_hash, leechers, seeders, num_files, size, username, added, status, category, imdb }
        return data.map(item => ({
            name: item.name,
            magnet: `magnet:?xt=urn:btih:${item.info_hash}`,
            time: new Date(parseInt(item.added) * 1000).toLocaleString(),
            type: item.category, // apibay uses numeric categories, we'll just use that for now or map it if needed
            size: formatSize(parseInt(item.size))
        }));

    } catch (err) {
        console.error('BT API Error:', err);
        return [];
    }
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}