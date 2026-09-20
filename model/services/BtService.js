import Parser from 'rss-parser';
import Config from '../../components/Config.js';
import { ProxyAgent } from 'undici';

// 2026-09-20 实测返回有效 RSS，各来源并行搜索。
const SOURCES = [
    { name: 'Nyaa', url: 'https://nyaa.si/', params: { page: 'rss' }, query: 'q' },
    { name: '动漫花园', url: 'https://share.dmhy.org/topics/rss/rss.xml', query: 'keyword' },
    { name: 'Mikan', url: 'https://mikanani.me/RSS/Search', query: 'searchstr' }
];
const REQUEST_TIMEOUT = 10000;
const parser = new Parser({
    customFields: { item: ['nyaa:infoHash', 'nyaa:size', 'nyaa:category', 'torrent'] }
});

function formatSize(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 1) return '未知';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${parseFloat((value / 1024 ** index).toFixed(2))} ${units[index]}`;
}

function parseItem(item, source) {
    const name = item.title?.trim();
    const hash = item['nyaa:infoHash']?.trim();
    let magnet = '';
    if (/^[a-f0-9]{40}$/i.test(hash || '')) {
        magnet = `magnet:?xt=urn:btih:${hash.toLowerCase()}&dn=${encodeURIComponent(name || '')}`;
    } else {
        const links = [item.enclosure?.url, item.link];
        magnet = links.find(link => /^magnet:\?[^\s]*xt=urn:btih:(?:[a-f0-9]{40}|[a-z2-7]{32})(?:&|$)/i.test(link || ''))
            || links.find(link => /^https?:\/\/[^\s]+\.torrent(?:\?|$)/i.test(link || '')) || '';
    }
    if (!name || !magnet) return null;

    const date = new Date(item.isoDate || item.pubDate || item.torrent?.pubDate?.[0] || '');
    const sizeInText = (item.contentSnippet || name).match(/\[\s*(\d+(?:\.\d+)?\s*[KMGT]i?B)\s*\]/i)?.[1];
    // 动漫花园的 enclosure.length 常为占位值 1，不代表实际大小。
    const size = item['nyaa:size'] || sizeInText
        || (source === 'Mikan' ? formatSize(item.enclosure?.length) : '未知');
    return {
        name,
        magnet,
        time: Number.isNaN(date.getTime()) ? '未知' : date.toLocaleString('zh-CN'),
        type: item['nyaa:category'] || 'BT',
        size,
        source
    };
}

function resultKey(item) {
    const hash = item.magnet.match(/xt=urn:btih:([a-f0-9]{40}|[a-z2-7]{32})(?:&|$)/i)?.[1];
    return hash ? hash.toLowerCase() : item.magnet;
}

async function fetchFeed(url, dispatcher) {
    const options = {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' }
    };
    if (dispatcher) options.dispatcher = dispatcher;
    const response = await fetch(url, options);
    if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
    }
    // 超时信号覆盖响应体读取，避免收到响应头后无限等待。
    const text = await response.text();
    if (!/<rss[\s>]/i.test(text)) throw new Error('返回内容不是 RSS');
    return parser.parseString(text);
}

async function searchSource(source, keyword, config, dispatcher) {
    const url = new URL(source.url);
    url.search = new URLSearchParams({ ...source.params, [source.query]: keyword }).toString();
    let feed;
    if (config.proxyApi?.enable && config.proxyApi.url) {
        try {
            const proxyUrl = config.proxyApi.url.replace('{{url}}', encodeURIComponent(url.href));
            feed = await fetchFeed(proxyUrl, dispatcher);
        } catch (error) {
            logger.warn(`[BT搜索][${source.name}] 代理 API 失败，尝试原站: ${error.message}`);
        }
    }
    feed ||= await fetchFeed(url.href, dispatcher);
    return (feed.items || []).map(item => parseItem(item, source.name)).filter(Boolean);
}

/** 返回去重后的搜索结果；来源失败且没有结果时抛出错误，与无匹配结果区分。 */
export async function btApi(keyword) {
    keyword = String(keyword || '').trim();
    if (!keyword) return [];
    const config = Config.getDefOrConfig('config').bt || {};
    const dispatcher = config.proxy?.enable && config.proxy.url ? new ProxyAgent(config.proxy.url) : undefined;
    try {
        const searches = await Promise.allSettled(SOURCES.map(source => searchSource(source, keyword, config, dispatcher)));
        const results = [];
        const seen = new Set();
        const errors = [];
        searches.forEach((search, index) => {
            if (search.status === 'rejected') {
                errors.push(search.reason);
                logger.warn(`[BT搜索][${SOURCES[index].name}] ${search.reason.message}`);
                return;
            }
            for (const item of search.value) {
                const key = resultKey(item);
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push(item);
                }
            }
        });
        if (!results.length && errors.length) {
            throw new AggregateError(errors, '搜索来源不可用或未完整返回结果');
        }
        return results;
    } finally {
        await dispatcher?.close();
    }
}
