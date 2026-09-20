export const queryAliases = {
      alerts: ["警报", "警报信息", "警报列表", "alerts"],
      events: ["活动", "事件", "事件信息", "热美亚", "活动信息"],
      news: ["新闻", "飞船新闻", "news"],
      earth: ["地球时间", "地球", "地球时间信息"],
      cetus: ["地球平原", "赛特斯", "赛特斯时间", "平原时间", "地球平原时间"],
      solaris: ["金星平原", "索拉里斯", "金星平原时间"],
      bounty: ["赏金", "赏金信息", "赏金任务", "bounty"],
      fissures: ["裂隙", "裂隙信息", "裂缝", "裂缝信息", "fissures"],
      trader: ["商人", "奸商", "奸商信息", "voidTrader", "trader"],
      sortie: ["突击", "今日突击", "突击信息", "sortie"],
      invasions: ["入侵", "入侵信息", "invasions"],
      deals: ["特惠", "每日优惠", "今日优惠", "deals"],
      season: ["电波", "电波任务", "电波信息", "nightwave", "season"],
    };

export const queryPattern = new RegExp(`^(?:#?wf\\s*)?(${Object.values(queryAliases).flat().sort((a, b) => b.length - a.length).join("|")})`, "i");

export function resolveQuery(message) {
  const alias = String(message).trim().match(queryPattern)?.[1].toLowerCase();
  return Object.keys(queryAliases).find(key => queryAliases[key].some(value => value.toLowerCase() === alias));
}

const titles = { alerts: "警报任务", events: "活动追踪", news: "飞船新闻", earth: "地球周期", cetus: "赛特斯平原", solaris: "金星平原", bounty: "赏金任务", fissures: "虚空裂隙", trader: "虚空商人", sortie: "今日突击", invasions: "入侵战况", deals: "每日特惠", season: "午夜电波", ordis: "奥迪斯通讯" };
const list = value => Array.isArray(value) ? value.filter(item => item && typeof item === "object") : [];
const plain = value => typeof value === "string" || typeof value === "number" ? String(value).replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/(?:https?:)?\/\/[^\s<>"']+/gi, "").replace(/(?:[\w-]+\.)*null00\.com(?:\/[^\s<>"']*)?/gi, "").trim() : "";
const rewards = value => Array.isArray(value) ? value.map(item => `${plain(item.item || item.itemType) || "未知奖励"} × ${item.itemCount ?? 1}`).join(" · ") : plain(value);
const stamp = value => {
  if (value == null || value === "") return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number * (number < 1e12 ? 1000 : 1) : Date.parse(value);
};
const date = value => Number.isFinite(stamp(value)) ? new Date(stamp(value)).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "时间暂未提供";
export function remaining(value, now = Date.now()) {
  const diff = stamp(value) - now;
  if (!Number.isFinite(diff)) return "时间暂未提供";
  if (diff <= 0) return "已结束 · 等待刷新";
  const minutes = Math.ceil(diff / 60000);
  return `${Math.floor(minutes / 1440) ? Math.floor(minutes / 1440) + "天 " : ""}${Math.floor(minutes % 1440 / 60)}小时 ${minutes % 60}分`;
}

export function buildWarframeView(endpoint, input, { server = "ZHCN", now = Date.now() } = {}) {
  if (input?.code != null && Number(input.code) !== 200) throw new Error("世界状态接口返回错误");
  const data = input?.result ?? input ?? {};
  const view = { title: titles[endpoint] || "世界状态", server: server === "ZH" ? "国际服" : "国服", generatedAt: date(now), cards: [], hero: null };
  const card = (title, badge, fields = [], body = "", progress = null) => {
    const item = { title: plain(title) || "任务详情", badge: plain(badge), fields: fields.filter(([, value]) => value != null && value !== "").map(([label, value]) => ({ label, value: plain(value) })), body: plain(body), rewards: [], progress };
    view.cards.push(item);
    return item;
  };
  const until = item => ["剩余时间", remaining(item.expiry, now)];
  const level = item => ["敌人等级", item.minEnemyLevel == null ? "未知" : `${item.minEnemyLevel}–${item.maxEnemyLevel ?? item.minEnemyLevel}`];
  if (["earth", "cetus", "solaris"].includes(endpoint)) {
    const expiry = endpoint === "earth" ? data.earthDate : endpoint === "cetus" ? data.cetusTime : data.solarisExpiry ?? data.expiry;
    const stale = stamp(expiry) <= now;
    const state = endpoint === "solaris" ? (typeof data.isWarm === "boolean" ? data.isWarm ? "温暖" : "寒冷" : typeof data.state === "string" ? data.state : "温度状态暂未提供") : typeof data.day === "boolean" ? data.day ? "白昼" : "夜晚" : "状态暂未提供";
    view.hero = { label: stale ? "上次观测 · " + state : state, value: remaining(expiry, now), detail: "周期切换时间 · " + date(expiry) };
  } else if (endpoint === "bounty") {
    for (const region of list(data)) for (const job of list(region.jobs)) {
      card(job.jobType, region.tag, [level(job), ["段位要求", job.masteryReq], ["阶段声望", Array.isArray(job.xpAmounts) ? job.xpAmounts.join(" / ") : ""], until(region)]).rewards = rewards(job.rewards).split("\n").filter(Boolean);
    }
  } else if (endpoint === "trader") {
    const arrived = typeof data.arrivals === "boolean" ? data.arrivals : stamp(data.activation) <= now && stamp(data.expiry) > now;
    view.hero = { label: arrived ? "商人已抵达" : "等待商人抵达", value: remaining(arrived ? data.expiry : data.activation, now), detail: `${plain(data.character) || "巴洛·基·提尔"} · ${plain(data.node) || "地点待公布"}` };
    for (const item of list(data.manifest)) card(item.itemType, "商品", [["杜卡德金币", item.primePrice], ["星币", item.regularPrice]]);
  } else if (endpoint === "sortie") {
    list(data.variants).forEach((item, index) => card(item.node, `阶段 ${index + 1}`, [["任务", item.missionType], ["特殊条件", item.modifierType], ["目标", data.boss], until(data)]));
  } else if (endpoint === "season") {
    for (const item of list(data.challenges)) card(item.name, item.cycle || (item.daily ? "每日" : "每周"), [["声望奖励", item.xp], until(item)], item.challenge);
  } else if (endpoint === "ordis") {
    const content = plain(data.msg ?? data);
    const chunks = Array.from(content || "暂无回复，请稍后重试。");
    for (let i = 0; i < chunks.length; i += 800) {
      card("通讯记录", "ORDIS").body = chunks.slice(i, i + 800).join("");
    }
  } else {
    for (const item of list(data)) {
      if (endpoint === "alerts") card(item.location, item.missionType, [["阵营", item.faction], level(item), ["星币", item.credits], until(item)], rewards(item.rewards));
      if (endpoint === "fissures") card(item.node, `${plain(item.modifier) || "虚空裂隙"}${item.hard ? " · 钢铁之路" : ""}`, [["任务", item.missionType], ["阵营", item.faction], until(item)]);
      if (endpoint === "news") card(item.message || item.defaultMessages || item.body, "公告", [["发布时间", date(item.date)]], item.link || item.prop);
      if (endpoint === "events") card(item.tag, "活动", [["地点", item.node], until(item)], "", item.healthPct == null ? null : clamp(item.healthPct));
      if (endpoint === "deals") card(item.item, "特惠", [["现价 / 原价", `${item.salePrice ?? "未知"} / ${item.originalPrice ?? "未知"}`], ["折扣", item.discount == null ? "未知" : `${item.discount}%`], ["已售 / 总量", `${item.sold ?? "未知"} / ${item.total ?? "未知"}`], until(item)]);
      if (endpoint === "invasions") {
        const progress = Number(item.goal) > 0 && Number.isFinite(Number(item.count)) ? clamp((Number(item.count) + Number(item.goal)) / (2 * Number(item.goal)) * 100) : null;
        card(item.node, item.completed ? "已完成" : item.locTag || "入侵", [["进攻方", item.attacker?.faction], ["进攻奖励", rewards(item.attacker?.rewards)], ["防守方", item.defender?.faction], ["防守奖励", rewards(item.defender?.rewards)]], "", progress);
      }
    }
  }
  return view;
}

function clamp(value) {
  return Number.isFinite(Number(value)) ? Math.round(Math.max(0, Math.min(100, Number(value))) * 10) / 10 : null;
}

export function paginateWarframeView(view) {
  const pages = [];
  let cards = [], weight = 0;
  for (const card of view.cards) {
    const lines = text => text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 38)), 0);
    const cost = 110 + Math.ceil(card.title.length / 22) * 38
      + Math.ceil(card.fields.reduce((sum, field) => sum + Math.ceil((field.label.length + field.value.length) / 18), 0) / 2) * 32
      + (card.body ? lines(card.body) * 37 + 32 : 0)
      + (card.rewards.length ? Math.ceil(card.rewards.reduce((sum, reward) => sum + Math.ceil(reward.length / 18), 0) / 2) * 37 + 32 : 0);
    if (cards.length && (weight + cost > 1350 || cards.length >= 6)) {
      pages.push({ ...view, cards });
      cards = []; weight = 0;
    }
    cards.push(card); weight += cost;
  }
  if (cards.length || !pages.length) pages.push({ ...view, cards });
  return pages.map((page, index) => ({ ...page, page: index + 1, pages: pages.length }));
}
