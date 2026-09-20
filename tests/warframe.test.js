import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import * as views from "../model/services/WarframeView.js";

const now = 1789900000000;
const build = (endpoint, data) => views.buildWarframeView(endpoint, data, { now });

test("all existing Warframe aliases resolve, including longest matches and uppercase prefixes", () => {
  for (const [endpoint, aliases] of Object.entries(views.queryAliases)) {
    for (const alias of aliases) for (const prefix of ["", "wf", "#wf", "#WF "]) {
      assert.equal(views.resolveQuery(prefix + alias), endpoint);
    }
  }
  assert.equal(views.resolveQuery("#新闻"), undefined);
});

test("cycle timestamps support seconds, milliseconds and ISO without making expired values positive", () => {
  for (const value of [(now + 600000) / 1000, now + 600000, new Date(now + 600000).toISOString()]) {
    assert.equal(views.remaining(value, now), "0小时 10分");
  }
  assert.match(build("earth", { earthDate: now / 1000 - 1, day: false }).hero.label, /上次观测.*夜晚/);
  assert.match(build("cetus", { cetusTime: now / 1000 - 1, day: true }).hero.value, /等待刷新/);
  assert.match(build("solaris", { solarisExpiry: now / 1000 + 600, state: 2 }).hero.label, /暂未提供/);
  assert.equal(views.remaining(null, now), "时间暂未提供");
});

test("invasion progress is calculated per item, clamped, and retains both sides' rewards", () => {
  const cards = build("invasions", [-200, -50, 50, 200].map(count => ({ count, goal: 100, attacker: { rewards: [{ item: "奖励", itemCount: 3 }] } }))).cards;
  assert.deepEqual(cards.map(card => card.progress), [0, 25, 75, 100]);
  assert.ok(cards[0].fields.some(field => field.value === "奖励 × 3"));
  assert.equal(build("invasions", [{ count: 1, goal: 0 }]).cards[0].progress, null);
});

test("zero prices, new fissure tiers, trader inventories and bounty rewards are preserved", () => {
  const deal = build("deals", [{ salePrice: 0, originalPrice: 10, discount: 0, sold: 0, total: 1 }]).cards[0];
  assert.equal(deal.fields[0].value, "0 / 10");
  assert.equal(deal.fields[1].value, "0%");
  assert.match(build("fissures", [{ modifier: "VoidT6", hard: true }]).cards[0].badge, /VoidT6.*钢铁/);
  assert.equal(build("trader", { manifest: [{ itemType: "高阶重创", primePrice: 0 }] }).cards.length, 1);
  const bounty = build("bounty", [{ tag: "赛特斯", jobs: [{ jobType: "任务", masteryReq: 0, rewards: "奖励一<br />奖励二" }] }]).cards[0];
  assert.deepEqual(bounty.rewards, ["奖励一", "奖励二"]);
  assert.ok(bounty.fields.some(field => field.label === "段位要求" && field.value === "0"));
});

test("empty and incomplete responses render safely; API errors are not disguised as empty data", () => {
  for (const endpoint of Object.keys(views.queryAliases)) {
    for (const input of [null, {}, [], [null, {}]]) assert.ok(build(endpoint, input));
  }
  assert.throws(() => build("alerts", { code: 500, msg: "error" }));
  assert.equal(build("alerts", { code: 200, result: [{ location: "地球" }] }).cards[0].title, "地球");
});

test("pagination preserves every item in order and all long Ordis text", () => {
  const view = build("trader", { manifest: Array.from({ length: 33 }, (_, i) => ({ itemType: `商品${i}` })) });
  const pages = views.paginateWarframeView(view);
  assert.ok(pages.length > 1);
  assert.deepEqual(pages.flatMap(page => page.cards), view.cards);
  assert.ok(pages.every((page, i) => page.page === i + 1 && page.pages === pages.length));
  const text = "奥迪斯🛰️ 通讯\n".repeat(450).trim();
  const reply = build("ordis", { msg: text });
  assert.equal(views.paginateWarframeView(reply).flatMap(page => page.cards).map(card => card.body).join(""), text);
});

async function app({ fetchJSON = async () => [], render = async () => [{ type: "image" }], log = () => {} } = {}) {
  let server = "ZHCN";
  const imports = {
    "../components/Config.js": { default: { getConfig: () => ({ warframe: { server } }) } },
    "../components/Index.js": { Render: { render } },
    "../../../lib/plugins/plugin.js": { default: class { constructor(options) { Object.assign(this, options); } } },
    "../model/HelpService.js": { default: {} },
    "../model/services/WarframeService.js": { default: fetchJSON },
    "../model/services/WarframeView.js": views,
  };
  const context = vm.createContext({ URLSearchParams, logger: { error: log } });
  const module = new vm.SourceTextModule(await fs.readFile(new URL("../apps/Warframe.js", import.meta.url), "utf8"), { context });
  await module.link(specifier => {
    const values = imports[specifier];
    assert.ok(values, specifier);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return { plugin: new module.namespace.warframe(), setServer: value => { server = value; } };
}

test("queries send paginated images and read server configuration on each request", async () => {
  const urls = [], replies = [], rendered = [];
  const loaded = await app({
    fetchJSON: async url => { urls.push(url); return Array.from({ length: 17 }, (_, i) => ({ node: `裂隙${i}` })); },
    render: async (path, data) => { assert.equal(path, "html/warframe/warframe"); rendered.push(data); return [{ type: "image" }]; },
  });
  const event = { msg: "#WF 裂隙", reply: async message => replies.push(message) };
  await loaded.plugin.wfquery(event);
  loaded.setServer("ZH");
  await loaded.plugin.wfquery(event);
  assert.match(urls[0], /\/ZHCN\/fissures$/);
  assert.match(urls[1], /\/ZH\/fissures$/);
  assert.equal(rendered.filter(page => page.server === "国服").flatMap(page => page.cards).length, 17);
  assert.ok(replies.every(message => message[0].type === "image"));
});

test("Ordis posts encoded text and renders its answer; network and renderer failures give a useful reply", async () => {
  let options;
  const replies = [];
  const loaded = await app({ fetchJSON: async (_, opts) => { options = opts; return { msg: "测试答复" }; }, render: async (_, page) => {
    assert.equal(page.cards[0].body, "测试答复"); return [{ type: "image" }];
  } });
  await loaded.plugin.ordis({ msg: "奥迪斯 阴阳 & 双子", reply: async value => replies.push(value) });
  assert.equal(options.body.get("text"), "阴阳 & 双子");
  assert.equal(options.method, "POST");
  for (const overrides of [{ fetchJSON: async () => { throw new Error("offline"); } }, { render: async () => false }]) {
    const failing = await app(overrides);
    await failing.plugin.wfquery({ msg: "#wf警报", reply: async value => replies.push(value) });
    assert.match(replies.at(-1), /失败.*重试/);
  }
});

test("Warframe outputs hide request addresses and raw errors", async () => {
  const secret = "https://private-api.example/query?token=hidden";
  const view = build("ordis", { msg: `正常内容 ${secret}` });
  assert.equal(view.cards[0].body, "正常内容");
  const template = await fs.readFile(new URL("../resources/html/warframe/warframe.html", import.meta.url), "utf8");
  assert.doesNotMatch(template, /https?:|数据来源|api\./i);
  const output = [];
  const loaded = await app({ fetchJSON: async () => { throw new Error(secret); }, log: (...args) => output.push(args) });
  await loaded.plugin.wfquery({ msg: "#wf警报", reply: async value => output.push(value) });
  assert.doesNotMatch(JSON.stringify(output), /private-api|token=|https?:/);
});
