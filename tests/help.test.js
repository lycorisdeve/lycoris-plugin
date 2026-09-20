import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import lodash from 'lodash';
import * as custom from '../config/help.js';
import * as system from '../config/system/help_system.js';

test('default and custom help share one menu without removed or missing features', () => {
    assert.equal(custom.helpList, system.helpList);
    const text = JSON.stringify(system.helpList);
    assert.doesNotMatch(text, /秀人|秀图|摸鱼日历|摸鱼视频|动漫写真|高清壁纸|来点cos/);
    assert.match(text, /AI排行/);
    assert.match(text, /#bt搜索/);
    assert.match(text, /#ts绘图/);
});

test('every menu title matches a current command with an implemented handler', async () => {
    const files = await fs.readdir(new URL('../apps/', import.meta.url));
    const rules = [];
    for (const file of files.filter(file => file.endsWith('.js'))) {
        const source = await fs.readFile(new URL(`../apps/${file}`, import.meta.url), 'utf8');
        const matcher = /reg:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/(?:\\.|[^/\\])*\/[a-z]*)\s*,\s*(?:\/\*[^]*?\*\/\s*)?fnc:\s*['"](\w+)['"]/g;
        for (const match of source.matchAll(matcher)) {
            if (!new RegExp(`\\b${match[2]}\\s*\\(`).test(source)) continue;
            const expression = vm.runInNewContext(match[1]);
            rules.push(new RegExp(expression));
        }
    }
    for (const group of system.helpList) {
        for (const item of group.list) {
            for (const command of item.title.split(' / ')) {
                assert.ok(rules.some(rule => rule.test(command)), `Missing command or handler: ${command}`);
            }
        }
    }
    await assert.rejects(fs.access(new URL('../apps/Xiuren.js', import.meta.url)));
});

test('help rendering data hides master groups from ordinary users', async () => {
    const context = vm.createContext({ console });
    const module = new vm.SourceTextModule(await fs.readFile(new URL('../model/HelpService.js', import.meta.url), 'utf8'), { context });
    const imports = {
        'fs/promises': { default: fs },
        'lodash': { default: lodash },
        '../components/Index.js': { Common: {}, Data: { importCfg: async () => ({ diyCfg: custom, sysCfg: system }) } },
        '../components/help/HelpTheme.js': { default: { getThemeData: async () => ({}) } },
        '../components/lib/Path.js': { pluginResources: new URL('../resources', import.meta.url).pathname }
    };
    await module.link(name => new vm.SyntheticModule(Object.keys(imports[name]), function () {
        for (const [key, value] of Object.entries(imports[name])) this.setExport(key, value);
    }, { context }));
    await module.evaluate();
    const ordinary = await module.namespace.default.help({ isMaster: false });
    const master = await module.namespace.default.help({ isMaster: true });
    assert.ok(ordinary.helpGroup.length > 0);
    assert.ok(ordinary.helpGroup.every(group => group.auth !== 'master'));
    assert.ok(master.helpGroup.some(group => group.auth === 'master'));
    assert.ok(master.helpGroup.every(group => group.list.every(item => item.css)));
});
