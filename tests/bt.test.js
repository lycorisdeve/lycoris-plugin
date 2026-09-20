import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import Parser from 'rss-parser';

const HASH = '0123456789abcdef0123456789abcdef01234567';
const feed = items => `<?xml version="1.0"?><rss version="2.0" xmlns:nyaa="https://nyaa.si/xmlns/nyaa"><channel><title>Test</title>${items}</channel></rss>`;
const nyaa = feed(`<item><title>Ubuntu &amp; tools</title><nyaa:infoHash>${HASH}</nyaa:infoHash><nyaa:size>2 GiB</nyaa:size><pubDate>Tue, 03 Nov 2009 07:03:00 GMT</pubDate></item>`);
const mikan = feed('<item><title>Ubuntu ISO</title><link>https://mikanani.me/Home/Episode/example</link><enclosure url="https://mikanani.me/Download/example.torrent" type="application/x-bittorrent" length="1073741824"/><torrent xmlns="https://mikanani.me/0.1/"><pubDate>2026-09-01T08:00:00</pubDate></torrent></item>');
const dmhy = feed(`<item><title>Ubuntu mirror</title><enclosure url="magnet:?xt=urn:btih:${HASH.toUpperCase()}&amp;dn=Ubuntu" length="1" type="application/x-bittorrent"/></item>`);

async function loadModule(file, { imports = {}, globals = {} } = {}) {
    const context = vm.createContext({
        URL, URLSearchParams, AbortController, AbortSignal, setTimeout, clearTimeout,
        logger: { info() {}, warn() {}, error() {} },
        plugin: class { constructor(options) { Object.assign(this, options); } },
        ...globals
    });
    const module = new vm.SourceTextModule(await fs.readFile(new URL(file, import.meta.url), 'utf8'), { context });
    await module.link(specifier => {
        assert.ok(imports[specifier], `Unmocked import: ${specifier}`);
        const values = imports[specifier];
        return new vm.SyntheticModule(Object.keys(values), function () {
            for (const [key, value] of Object.entries(values)) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

async function service(fetch, config = {}, ProxyAgent = class {}, globals = {}) {
    return loadModule('../model/services/BtService.js', {
        imports: {
            'rss-parser': { default: Parser },
            '../../components/Config.js': { default: { getDefOrConfig: () => ({ bt: config }) } },
            'undici': { ProxyAgent }
        },
        globals: { fetch, ...globals }
    });
}

test('encodes keywords, omits null dispatcher, returns usable links and deduplicates hashes', async () => {
    const keyword = 'Ubuntu & 工具+#';
    const api = await service(async (url, options) => {
        assert.notEqual(options.dispatcher, null);
        const parsed = new URL(url);
        assert.equal(parsed.searchParams.get('q') || parsed.searchParams.get('searchstr') || parsed.searchParams.get('keyword'), keyword);
        return new Response(parsed.hostname === 'nyaa.si' ? nyaa : parsed.hostname.includes('mikan') ? mikan : dmhy);
    });
    const results = await api.btApi(keyword);
    assert.equal(results.length, 2);
    assert.ok(results.some(item => item.magnet.startsWith(`magnet:?xt=urn:btih:${HASH}`)));
    const torrent = results.find(item => item.source === 'Mikan');
    assert.equal(torrent.magnet, 'https://mikanani.me/Download/example.torrent');
    assert.equal(torrent.size, '1 GB');
    assert.notEqual(torrent.time, 'Invalid Date');
});

test('invalid proxy HTML falls back to direct RSS with existing config', async () => {
    const requests = [];
    const api = await service(async url => {
        requests.push(url);
        return new Response(new URL(url).hostname === 'proxy.example' ? '<html>Proxy unavailable</html>' : nyaa);
    }, { proxyApi: { enable: true, url: 'https://proxy.example/{{url}}' } });
    const results = await api.btApi('Ubuntu');
    assert.ok(results.length > 0);
    assert.ok(requests.some(url => url.startsWith('https://proxy.example/')));
    assert.ok(requests.some(url => url.startsWith('https://nyaa.si/')));
});

test('all sources failing is an error, not an empty search', async () => {
    const api = await service(async () => new Response('Unavailable', { status: 503 }));
    await assert.rejects(api.btApi('Ubuntu'));
});

test('valid empty RSS means no matches; partial failure retains other results', async () => {
    const empty = await service(async () => new Response(feed('')));
    assert.equal((await empty.btApi('nothing')).length, 0);
    const partial = await service(async url => {
        if (new URL(url).hostname === 'nyaa.si') return new Response(nyaa);
        throw new Error('connection reset');
    });
    assert.equal((await partial.btApi('Ubuntu')).length, 1);
});

test('body reads remain covered by the request timeout', async () => {
    const api = await service(async (url, options) => {
        return { ok: true, text: () => new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(nyaa), 500);
            options.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(options.signal.reason);
            }, { once: true });
        }) };
    }, {}, undefined, { AbortSignal: { timeout: () => AbortSignal.timeout(20) } });
    await assert.rejects(api.btApi('Ubuntu'));
});

test('configured HTTP proxy is used and released after requests', async () => {
    const agents = [];
    class Agent {
        constructor(url) { this.url = url; agents.push(this); }
        async close() { this.closed = true; }
    }
    const api = await service(async (url, options) => {
        assert.equal(options.dispatcher.url, 'http://127.0.0.1:7890');
        return new Response(nyaa);
    }, { proxy: { enable: true, url: 'http://127.0.0.1:7890' } }, Agent);
    await api.btApi('Ubuntu');
    assert.ok(agents.length > 0);
    assert.ok(agents.every(agent => agent.closed));
});

async function app(btApi, Bot = {}) {
    const module = await loadModule('../apps/Bt.js', {
        imports: { '../model/services/BtService.js': { btApi } },
        globals: { Bot }
    });
    return new module.bt();
}

test('BT command uses the supplied event, limits results and labels torrent URLs', async () => {
    const replies = [];
    let nodes;
    const instance = await app(async () => Array.from({ length: 12 }, () => ({
        name: 'Ubuntu', source: 'Mikan', size: '1 GB', time: '未知', magnet: 'https://example.com/ubuntu.torrent'
    })), { makeForwardMsg: async list => { nodes = list; return 'forward'; } });
    await instance.search({ msg: '#bt搜索 Ubuntu', user_id: 1, reply: async msg => { replies.push(msg); return true; } });
    assert.equal(nodes.length, 11);
    assert.match(nodes[1].message, /种子/);
    assert.ok(replies.includes('forward'));
});

test('empty keyword gets usage and search/network failures get distinct replies', async () => {
    const replies = [];
    const event = { msg: '#bt搜索', user_id: 1, reply: async msg => { replies.push(msg); return true; } };
    const empty = await app(async () => []);
    await empty.search(event);
    assert.match(replies.pop(), /关键词/);
    await empty.search({ ...event, msg: 'bt Ubuntu' });
    assert.match(replies.pop(), /没有搜索到/);
    const failed = await app(async () => { throw new Error('network'); });
    await failed.search({ ...event, msg: '#bt搜索 Ubuntu' });
    assert.match(replies.pop(), /失败|不可用/);
});

test('forward delivery failure sends a plain failure reply without moderation actions', async () => {
    const replies = [];
    const instance = await app(async () => [{ name: 'Ubuntu', source: 'Nyaa', magnet: `magnet:?xt=urn:btih:${HASH}` }], {
        makeForwardMsg: async () => { throw new Error('forward failed'); }
    });
    await instance.search({ msg: 'bt Ubuntu', user_id: 1, reply: async msg => { replies.push(msg); return true; } });
    assert.match(replies.pop(), /发送失败/);
});
