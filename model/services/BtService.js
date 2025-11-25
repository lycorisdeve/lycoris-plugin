
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import Config from '../../components/Config.js';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * 将字节格式化为人类可读的字符串
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
 * 带超时的 fetch 请求
 * @param {string} url 
 * @param {number} timeout 
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // 获取配置
    const config = Config.getDefOrConfig('config');
    const btConfig = config.bt || {};

    let agent = null;
    let fetchUrl = url;

    // 优先使用 proxyApi
    if (btConfig.proxyApi && btConfig.proxyApi.enable && btConfig.proxyApi.url) {
        fetchUrl = btConfig.proxyApi.url.replace('{{url}}', encodeURIComponent(url));
    } else if (btConfig.proxy && btConfig.proxy.enable && btConfig.proxy.url) {
        try {
            agent = new HttpsProxyAgent(btConfig.proxy.url);
        } catch (err) {
            logger.error(`[BT搜索] 代理配置错误: ${err.message}`);
        }
    }

    try {
        const response = await fetch(fetchUrl, {
            signal: controller.signal,
            agent: agent
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

/**
 * 搜索 Sukebei Nyaa (RSS)
 * @param {string} keyword 
 * @returns {Promise<Array>}
 */
async function searchSukebei(keyword) {
    try {
        const url = `https://sukebei.nyaa.si/?page=rss&q=${keyword}`;
        const response = await fetchWithTimeout(url);
        const text = await response.text();
        const $ = cheerio.load(text, { xmlMode: true });

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
                    magnet: `${infoHash}`,
                    time: new Date(pubDate).toLocaleString(),
                    type: category,
                    size: size,
                    source: 'Sukebei'
                });
            }
        });
        return results;
    } catch (err) {
        logger.error(`[Sukebei] Search failed: ${err.message}`);
        return [];
    }
}

/**
 * 搜索 Nyaa (RSS)
 * @param {string} keyword 
 * @returns {Promise<Array>}
 */
async function searchNyaa(keyword) {
    try {
        const url = `https://nyaa.si/?page=rss&q=${keyword}`;
        const response = await fetchWithTimeout(url);
        const text = await response.text();
        const $ = cheerio.load(text, { xmlMode: true });

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
                    magnet: `${infoHash}`,
                    time: new Date(pubDate).toLocaleString(),
                    type: category,
                    size: size,
                    source: 'Nyaa'
                });
            }
        });
        return results;
    } catch (err) {
        logger.error(`[Nyaa] Search failed: ${err.message}`);
        return [];
    }
}

/**
 * 搜索 Mikan Project (RSS)
 * @param {string} keyword 
 * @returns {Promise<Array>}
 */
async function searchMikan(keyword) {
    try {
        const url = `https://mikanani.me/RSS/Search?searchstr=${keyword}`;
        const response = await fetchWithTimeout(url);
        const text = await response.text();
        const $ = cheerio.load(text, { xmlMode: true });

        const results = [];
        $('item').each((i, elem) => {
            const title = $(elem).find('title').text();
            const link = $(elem).find('link').text();
            const description = $(elem).find('description').text();
            const pubDate = $(elem).find('pubDate').text();
            const enclosure = $(elem).find('enclosure').attr('url');

            // Extract size from description if possible
            let size = 'N/A';
            if (description) {
                const parts = description.split('<br />');
                for (const part of parts) {
                    if (part.trim().startsWith('Size:')) {
                        size = part.replace('Size:', '').trim();
                    }
                }
            }

            results.push({
                name: title,
                magnet: enclosure || link, // Fallback to torrent file URL
                time: new Date(pubDate).toLocaleString(),
                type: 'Anime',
                size: size,
                source: 'Mikan'
            });
        });
        return results;
    } catch (err) {
        logger.error(`[Mikan] Search failed: ${err.message}`);
        return [];
    }
}

/**
 * 使用多源搜索种子
 * @param {string} keyword - 搜索关键字
 * @returns {Promise<Array<{name: string, magnet: string, time: string, type: string, size: string, source: string}>>}
 */
export async function btApi(keyword) {
    // Run searches in parallel
    const [sukebeiResults, nyaaResults, mikanResults] = await Promise.all([
        searchSukebei(keyword),
        searchNyaa(keyword),
        searchMikan(keyword)
    ]);

    let results = [...sukebeiResults, ...nyaaResults, ...mikanResults];

    return results;
}