import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import lodash from 'lodash';

async function load(file, imports, globals = {}) {
    const context = vm.createContext({
        URL, logger: { info() {}, warn() {}, error() {} },
        plugin: class { constructor(options) { Object.assign(this, options); } }, ...globals
    });
    const module = new vm.SourceTextModule(await fs.readFile(new URL(file, import.meta.url), 'utf8'), { context });
    await module.link(name => {
        assert.ok(imports[name], `Unexpected import: ${name}`);
        return new vm.SyntheticModule(Object.keys(imports[name]), function () {
            for (const [key, value] of Object.entries(imports[name])) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

const items = Array.from({ length: 4 }, (_, i) => ({ title: `游戏${i}`, link: `https://example.com/${i}` }));
const subscription = { name: 'Steam史低', url: 'https://example.com/rss', group: [123], merge_forward: true };

async function harness({ subs = [subscription], entries = items.slice(0, 2), config = {}, first = false, send } = {}) {
    const sent = [], records = [], initial = [];
    const rss = { subscribe_list: structuredClone(subs), ...config };
    const Bot = {
        uin: 999,
        pickGroup: () => ({ makeForwardMsg: async nodes => ({ type: 'forward', nodes }) }),
        sendGroupMsg: async (id, message) => {
            sent.push({ id, message });
            return send ? send(id, message) : { message_id: 'ok' };
        }
    };
    const module = await load('../model/services/RssService.js', {
        'rss-parser': { default: class {} },
        '../../components/Config.js': { default: { getConfig: () => ({ rss }) } },
        '../../components/Data.js': { default: { sleep: async () => {} } },
        'moment': { default: () => {} },
        'lodash': { default: lodash },
        '../sqlite3/RssDb.js': { RssHistory: {
            count: () => first ? 0 : 1, findOne: () => false,
            create: record => records.push(record), bulkCreate: rows => initial.push(...rows)
        } },
        '../../components/lib/Render.js': { default: {} },
        'cheerio': {}
    }, { Bot });
    const service = module.default;
    service.fetchFeed = async () => ({ title: 'Feed', items: entries });
    service.render = async (sub, feed, item) => ({ type: 'image', title: item.title });
    return { service, sent, records, initial, rss, Bot };
}

for (const count of [1, 3]) {
    test(`${count} new items produce one forward and retain item ordering`, async () => {
        const h = await harness({ entries: items.slice(0, count) });
        const result = await h.service.task();
        assert.equal(h.sent.length, 1);
        assert.equal(h.sent[0].message.type, 'forward');
        assert.equal(h.sent[0].message.nodes.length, count);
        assert.match(h.sent[0].message.nodes[0].message[0], new RegExp(`游戏${count - 1}`));
        assert.equal(h.records.length, count);
        assert.equal(result.pushed, count);
    });
}

test('disabled or missing switches preserve individual delivery, independently per subscription', async () => {
    const h = await harness({ subs: [subscription, { ...subscription, url: 'https://example.com/other', merge_forward: false }, { ...subscription, url: 'https://example.com/legacy', merge_forward: undefined }] });
    await h.service.task();
    assert.equal(h.sent.length, 5);
    assert.equal(h.sent.filter(s => s.message.type === 'forward').length, 1);
    assert.equal(h.sent.filter(s => s.message.type === 'image').length, 4);
});

test('separate subscriptions never share a forward', async () => {
    const h = await harness({ subs: [subscription, { ...subscription, name: '另一订阅', url: 'https://example.com/other' }] });
    await h.service.task();
    assert.equal(h.sent.length, 2);
    assert.equal(h.sent[0].message.nodes[0].nickname, 'Steam史低');
    assert.equal(h.sent[1].message.nodes[0].nickname, '另一订阅');
});

test('image send failures retry as a text-only forward, never as ordinary messages', async () => {
    const h = await harness({ send: (id, message) => {
        assert.equal(message.type, 'forward');
        if (message.nodes.some(n => Array.isArray(n.message))) throw new Error('image failed');
        return true;
    } });
    const result = await h.service.task();
    assert.equal(h.sent.length, 2);
    assert.ok(h.sent[1].message.nodes.every(n => typeof n.message === 'string'));
    assert.equal(result.pushed, 2);
});

test('render failure can become text inside a one-node forward', async () => {
    const h = await harness({ entries: items.slice(0, 1) });
    h.service.render = async () => null;
    await h.service.task();
    assert.equal(h.sent[0].message.nodes.length, 1);
    assert.equal(typeof h.sent[0].message.nodes[0].message, 'string');
});

test('render failure with text disabled leaves the entire batch unrecorded', async () => {
    const h = await harness({ config: { text_push: false } });
    h.service.render = async (sub, feed, item) => item === items[0] ? null : { type: 'image' };
    assert.equal((await h.service.task()).pushed, 0);
    assert.equal(h.sent.length, 0);
    assert.equal(h.records.length, 0);
});

test('failed forward stays unrecorded and task lock is released', async () => {
    const h = await harness({ send: () => false });
    assert.equal((await h.service.task()).pushed, 0);
    assert.equal(h.records.length, 0);
    assert.equal(h.service.taskRunning, false);
});

test('first subscription seeds history; forced push still sends latest three without recording', async () => {
    const h = await harness({ first: true, entries: items });
    assert.equal((await h.service.task()).pushed, 0);
    assert.equal(h.initial.length, 4);
    assert.equal(h.sent.length, 0);
    assert.equal((await h.service.task(true)).pushed, 3);
    assert.equal(h.sent[0].message.nodes.length, 3);
    assert.equal(h.records.length, 0);
});

test('default groups are deduplicated and at least one successful group preserves history semantics', async () => {
    const h = await harness({ subs: [{ ...subscription, group: [] }], config: { default_group: [123, '123', 456] }, send: id => {
        if (id === '123') throw new Error('group failed');
        return true;
    } });
    assert.equal((await h.service.task()).pushed, 2);
    assert.equal(h.sent.filter(s => s.id === '456').length, 1);
    assert.equal(h.records.length, 2);
});

async function commandHarness() {
    let rss = { push: true, subscribe_list: [structuredClone(subscription), { name: '其他', url: 'https://example.com/other', group: [] }] };
    const replies = [], writes = [];
    const module = await load('../apps/Rss.js', {
        '../model/services/RssService.js': { default: {} },
        '../components/Config.js': { default: {
            getConfig: () => ({ rss }),
            modify: (file, key, value) => { writes.push(value); rss = value; }
        } },
        'lodash': { default: lodash }
    });
    return { app: new module.Rss(), get rss() { return rss; }, writes,
        event: msg => ({ msg, reply: async text => replies.push(text) }), replies };
}

test('global mode combines all subscriptions even when their individual switches are disabled', async () => {
    const h = await harness({ config: { merge_forward: true }, subs: [
        { ...subscription, merge_forward: false },
        { ...subscription, name: '另一订阅', url: 'https://example.com/other', merge_forward: false }
    ] });
    const result = await h.service.task();
    assert.equal(h.sent.length, 1);
    assert.equal(h.sent[0].message.nodes.length, 4);
    assert.equal(new Set(h.sent[0].message.nodes.map(n => n.nickname)).size, 2);
    assert.equal(result.pushed, 4);
    assert.equal(h.records.length, 4);
});

test('global mode routes by group, renders each item once, and counts multi-group items once', async () => {
    const h = await harness({ config: { merge_forward: true, default_group: [789] }, subs: [
        { ...subscription, group: [123, 456, '123'] },
        { ...subscription, name: '仅群123', url: 'https://example.com/other', group: [123] },
        { ...subscription, name: '默认群', url: 'https://example.com/default', group: [] }
    ] });
    let renders = 0;
    h.service.render = async () => { renders++; return { type: 'image' }; };
    assert.equal((await h.service.task()).pushed, 6);
    assert.equal(renders, 6);
    assert.equal(h.sent.length, 3);
    assert.equal(h.sent.find(s => s.id === '123').message.nodes.length, 4);
    assert.ok(h.sent.find(s => s.id === '456').message.nodes.every(n => n.nickname === 'Steam史低'));
    assert.ok(h.sent.find(s => s.id === '789').message.nodes.every(n => n.nickname === '默认群'));
    assert.equal(h.records.length, 6);
});

test('global mode sends a one-node forward but no message for an empty check', async () => {
    const h = await harness({ config: { merge_forward: true }, entries: items.slice(0, 1) });
    await h.service.task();
    assert.equal(h.sent[0].message.nodes.length, 1);
    const empty = await harness({ config: { merge_forward: true }, entries: [] });
    assert.equal((await empty.service.task()).pushed, 0);
    assert.equal(empty.sent.length, 0);
});

test('global mode records only entries delivered to a successful target group', async () => {
    const h = await harness({ config: { merge_forward: true }, subs: [
        subscription, { ...subscription, name: '失败订阅', url: 'https://example.com/failed', group: [456] }
    ], send: id => id === '123' });
    assert.equal((await h.service.task()).pushed, 2);
    assert.equal(h.records.length, 2);
    assert.ok(h.records.every(r => r.feedUrl === subscription.url));
});

test('forced global checks merge three items per source without recording history', async () => {
    const h = await harness({ config: { merge_forward: true }, entries: items, subs: [
        subscription, { ...subscription, name: '其他', url: 'https://example.com/other' }
    ] });
    assert.equal((await h.service.task(true)).pushed, 6);
    assert.equal(h.sent.length, 1);
    assert.equal(h.sent[0].message.nodes.length, 6);
    assert.equal(h.records.length, 0);
});

test('global switch preserves subscription settings and is master-only', async () => {
    const h = await commandHarness();
    const original = JSON.stringify(h.rss.subscribe_list);
    assert.equal(h.app.rule.find(r => r.fnc === 'globalMergeSwitch').permission, 'master');
    await h.app.globalMergeSwitch(h.event('#rss 开启全局合并推送'));
    assert.equal(h.rss.merge_forward, true);
    await h.app.list(h.event('#rss list'));
    assert.match(h.replies.at(-1), /全局合并推送: 开启/);
    await h.app.globalMergeSwitch(h.event('#rss 关闭全局合并推送'));
    assert.equal(h.rss.merge_forward, false);
    assert.equal(JSON.stringify(h.rss.subscribe_list), original);
});

test('master-only switch supports name, index and URL; list reflects saved state', async () => {
    const h = await commandHarness();
    assert.equal(h.app.rule.find(r => r.fnc === 'mergeSwitch').permission, 'master');
    for (const target of ['Steam史低', '1', subscription.url]) {
        await h.app.mergeSwitch(h.event(`#rss 关闭合并推送 ${target}`));
        assert.equal(h.rss.subscribe_list[0].merge_forward, false);
        await h.app.mergeSwitch(h.event(`#rss 开启合并推送 ${target}`));
        assert.equal(h.rss.subscribe_list[0].merge_forward, true);
        assert.equal(h.rss.subscribe_list[1].merge_forward, undefined);
        assert.equal(h.rss.push, true);
    }
    await h.app.list(h.event('#rss list'));
    assert.match(h.replies.at(-1), /合并推送: 开启/);
    assert.match(h.replies.at(-1), /合并推送: 关闭/);
});

test('missing, unknown and ambiguous subscription selectors never modify config', async () => {
    const h = await commandHarness();
    for (const target of ['', '0', '99', '不存在']) await h.app.mergeSwitch(h.event(`#rss 开启合并推送 ${target}`));
    h.rss.subscribe_list.push({ name: 'Steam史低', url: 'https://example.com/duplicate' });
    await h.app.mergeSwitch(h.event('#rss 开启合并推送 Steam史低'));
    assert.equal(h.writes.length, 0);
    assert.match(h.replies.at(-1), /重复/);
});
