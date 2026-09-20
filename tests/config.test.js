import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import YAML from 'yaml';
import lodash from 'lodash';

const original = `# 文件说明
rss:
  # 总合并开关
  merge_forward: false # 单条也合并
  # 订阅列表
  subscribe_list:
    # Steam 的说明
    - url: https://example.com/steam
      name: Steam史低
      merge_forward: false # Steam 独立开关
      group: ["123"] # Steam 目标群
    # 另一个源的说明
    - url: https://example.com/other
      name: 其他
      merge_forward: true # 其他独立开关
  push: true
# 不相关配置
other: keep # English comment
`;

async function harness() {
    let content = original;
    let writes = 0;
    const imports = {
        fs: { default: { readFileSync: () => content, writeFileSync: (path, text) => { content = text; writes++; } } },
        lodash: { default: lodash }, yaml: { default: YAML }, chokidar: { default: {} },
        './Version.js': { default: {} }, './lib/Path.js': { pluginName: 'lycoris-plugin', pluginRootPath: '/fixture' },
        './YamlManager.js': { default: {} }, '../../../lib/config/config.js': { default: {} }
    };
    const context = vm.createContext({});
    const source = (await fs.readFile(new URL('../components/Config.js', import.meta.url), 'utf8'))
        .replace('export default new Config()', 'export default Config');
    const module = new vm.SourceTextModule(source, { context });
    await module.link(name => new vm.SyntheticModule(Object.keys(imports[name]), function () {
        for (const [key, value] of Object.entries(imports[name])) this.setExport(key, value);
    }, { context }));
    await module.evaluate();
    const config = Object.create(module.namespace.default.prototype);
    config.config = { 'config.config': 'cached' };
    return { config, get content() { return content; }, get writes() { return writes; },
        data: () => YAML.parse(content) };
}

test('changing an RSS switch preserves nested Chinese and English comments', async () => {
    const h = await harness();
    const rss = h.data().rss;
    rss.merge_forward = true;
    h.config.modify('config', 'rss', rss);
    assert.equal(h.data().rss.merge_forward, true);
    for (const comment of ['文件说明', '总合并开关', '单条也合并', '订阅列表', 'Steam 的说明', 'Steam 独立开关', 'Steam 目标群', '另一个源的说明', '其他独立开关', 'English comment']) {
        assert.ok(h.content.includes(comment), `Lost comment: ${comment}`);
    }
    assert.equal(h.config.config['config.config'], undefined);
});

test('changing one subscription preserves comments on its scalar and other subscriptions', async () => {
    const h = await harness();
    const rss = h.data().rss;
    rss.subscribe_list[0].merge_forward = true;
    h.config.modify('config', 'rss', rss);
    assert.equal(h.data().rss.subscribe_list[0].merge_forward, true);
    assert.match(h.content, /true # Steam 独立开关/);
    assert.match(h.content, /其他独立开关/);
    assert.match(h.content, /group: \[\s*"123"\s*\] # Steam 目标群/);
});

test('deleting or reordering subscriptions keeps comments attached to the correct URL', async () => {
    const h = await harness();
    const rss = h.data().rss;
    rss.subscribe_list.reverse();
    h.config.modify('config', 'rss', rss);
    assert.ok(h.content.indexOf('其他独立开关') < h.content.indexOf('Steam 独立开关'));
    rss.subscribe_list = rss.subscribe_list.slice(0, 1);
    h.config.modify('config', 'rss', rss);
    assert.match(h.content, /另一个源的说明/);
    assert.match(h.content, /其他独立开关/);
    assert.doesNotMatch(h.content, /Steam 独立开关/);
    assert.deepEqual(h.data().rss, rss);
});

test('new fields and subscriptions are added without losing existing comments', async () => {
    const h = await harness();
    const rss = h.data().rss;
    rss.cron = '*/10 * * * *';
    rss.subscribe_list.push({ url: 'https://example.com/new', name: '新增' });
    delete rss.push;
    h.config.modify('config', 'rss', rss);
    assert.deepEqual(h.data().rss, rss);
    assert.match(h.content, /Steam 独立开关/);
    assert.match(h.content, /其他独立开关/);
    assert.equal(h.data().other, 'keep');
});

test('saving identical values does not rewrite the file', async () => {
    const h = await harness();
    h.config.modify('config', 'rss', h.data().rss);
    assert.equal(h.writes, 0);
    assert.equal(h.content, original);
});

test('RSS switch commands preserve comments through the real Config.modify writer', async () => {
    const h = await harness();
    h.config.getConfig = () => h.data();
    const context = vm.createContext({ plugin: class { constructor(options) { Object.assign(this, options); } } });
    const imports = {
        '../model/services/RssService.js': { default: {} },
        '../components/Config.js': { default: h.config },
        lodash: { default: lodash }
    };
    const module = new vm.SourceTextModule(await fs.readFile(new URL('../apps/Rss.js', import.meta.url), 'utf8'), { context });
    await module.link(name => new vm.SyntheticModule(Object.keys(imports[name]), function () {
        for (const [key, value] of Object.entries(imports[name])) this.setExport(key, value);
    }, { context }));
    await module.evaluate();
    const app = new module.namespace.Rss();
    const event = msg => ({ msg, reply: async () => true });
    await app.globalMergeSwitch(event('#rss 开启全局合并推送'));
    await app.mergeSwitch(event('#rss 开启合并推送 Steam史低'));
    assert.equal(h.data().rss.merge_forward, true);
    assert.equal(h.data().rss.subscribe_list[0].merge_forward, true);
    assert.match(h.content, /总合并开关/);
    assert.match(h.content, /true # Steam 独立开关/);
    assert.match(h.content, /其他独立开关/);
});
