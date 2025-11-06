import fetch from "node-fetch";
import fs from "node:fs";
import yaml from "yaml";
import Config from "../components/Config.js";
import moment from "moment";
import https from "https";
import puppeteer from "puppeteer";
import { pluginRootPath } from "../components/lib/Path.js";
import { Render } from "../components/Index.js";
import plugin from "../../../lib/plugins/plugin.js";
import HelpService from "../model/HelpService.js";

const config = Config.getConfig("config");
let warframeConfig = config.warframe;
let server = warframeConfig.server || "";

let url;
if (server === "ZHCN") {
  url = "https://api.null00.com/world/ZHCN/";
} else if (server === "ZH") {
  url = "https://api.null00.com/world/ZH/";
} else {
  logger.error("warframe插件配置错误，服务器默认设置为国服");
  url = "https://api.null00.com/world/ZHCN/";
}

//1.定义命令规则
export class warframe extends plugin {
  constructor() {
    super({
      /** 功能名称 */
      name: "warframe",
      /** 功能描述 */
      dsc: "warframe信息查询",
      /** https://oicqjs.github.io/oicq/#events */
      event: "message",
      /** 优先级,数字越小等级越高 */
      priority: 2000,
      rule: [
        {
          /** 命令正则匹配 */
          reg: "#wf帮助|wfhelp|wf菜单|wf帮助|wf菜单", //匹配消息正则,命令正则
          /** 执行方法 */
          fnc: "menu",
        },
        {
          reg: "#wf(.*)", //匹配消息正则,命令正则
          /** 执行方法 */
          fnc: "wfquery",
        },
        {
          reg: "奥迪斯(.*)",
          fnc: "ordis",
        },
      ],
    });
  }

  async menu(e) {
    let data = await HelpService.customHelp(e, "warframe_help");

    let img = await Render.render("help/index.html", data, { e, scale: 1.2 });
    e.reply(img);
    return;
  }

  async ordis(e) {
    const keyword = e.msg.replace(/奥迪斯/, "").trim();
    if (!keyword) {
      e.reply(
        "请在命令后输入要查询的内容，例如：奥迪斯 阴阳双子 或 奥迪斯 平原时间"
      );
      return;
    }
    const url = "https://api.null00.com/ordis/getTextMessage";
    const agent = url.startsWith("https:")
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ text: keyword }),
      agent,
    });
    const data = await res.json();
    if (data.msg) {
      e.reply(data.msg);
    } else {
      e.reply("查询失败，请稍后重试");
    }
  }

  async wfquery(e) {
    let keyword = e.msg.replace(/#wf/, "").trim();

    // 别名映射：每个 endpoint 对应常见的别名/变体
    const queryAliases = {
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

    if (!keyword) {
      e.reply("请在命令后输入要查询的内容，例如：#wf警报 或 #wf赛特斯");
      return;
    }

    // 统一化关键词：去掉空格并转小写（方便匹配英文别名）
    const kw = keyword.replace(/\s+/g, "").toLowerCase();

    // 支持包含匹配（优先匹配更长的别名，避免短别名抢匹配）
    let endpoint = null;
    const aliasList = [];
    for (const ep of Object.keys(queryAliases)) {
      for (const a of queryAliases[ep]) aliasList.push({ alias: a, ep });
    }
    // 按别名长度降序，优先匹配长别名（例如“地球平原时间”优先于“地球”）
    aliasList.sort((x, y) => y.alias.length - x.alias.length);
    for (const item of aliasList) {
      if (kw.indexOf(item.alias.toLowerCase()) !== -1) {
        endpoint = item.ep;
        break;
      }
    }

    if (!endpoint) {
      e.reply(
        "无法识别的查询类型。请使用以下关键字之一：警报、活动、新闻、地球时间、地球平原/赛特斯、金星平原、赏金、裂隙、商人、突击、入侵、特惠、电波"
      );
      return;
    }

    try {
      let result = "查询失败：无数据返回";
      switch (endpoint) {
        case "alerts":
          result = await alerts();
          break;
        case "events":
          result = await events();
          break;
        case "news":
          result = await news();
          break;
        case "earth":
          result = await earthTime();
          break;
        case "cetus":
          result = await cetusTime();
          break;
        case "solaris":
          result = await solarisTime();
          break;
        case "bounty":
          result = await bounty();
          break;
        case "fissures":
          result = await fissures();
          break;
        case "trader":
          result = await trader();
          break;
        case "sortie":
          result = await sortie();
          break;
        case "deals":
          result = await deals();
          break;
        case "invasions":
          result = await invasions();
          break;
        case "season":
          result = await season();
          break;
        default:
          result = "未实现的查询类型：" + endpoint;
      }

      if (typeof result === "string") {
        e.reply(result);
      } else {
        e.reply(JSON.stringify(result));
      }
    } catch (err) {
      e.reply("查询出错：" + (err && err.message ? err.message : err));
    }
  }
}

// ----- 查询处理函数与工具 -----
async function alerts() {
  const data = await getJsonData("alerts");
  if (!data || !Array.isArray(data) || data.length === 0)
    return "当前没有警报信息";
  let out = "         警报        \n==================\n";
  for (const a of data) {
    out += `${a.location}\n${a.missionType} 丨 ${a.faction} （${a.minEnemyLevel} ~ ${a.maxEnemyLevel}）\n奖励丨星币 * ${a.credits}\n`;
    if (a.rewards && a.rewards.length) {
      out += "奖励明细：\n";
      for (const r of a.rewards) {
        out += `  ${r.item} * ${r.itemCount}\n`;
      }
    }
    // 计算剩余时间
    const expiry = a.expiry;
    out += `剩余时间丨${calculationNowTimeDiff(expiry)}\n`;

    out += `开始时间丨${
      a.activation ? moment.unix(a.activation).format(`llll`) : "-"
    }\n`;
    out += `剩余时间丨${expiry ? moment.unix(expiry).format(`llll`) : "-"}\n`;
    out += "==================\n";
  }
  return out;
}

async function news() {
  const data = await getJsonData("news");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无新闻";
  let out = "        飞船新闻       \n==================\n";
  for (const n of data) {
    let time = n.date ? moment.unix(n.date).format(`llll`) : "";
    const msg = n.message || n.defaultMessages || n.body || "(无正文)";
    const link = n.link || n.prop || "";
    out += `${msg}\n\n    链接丨${link}\n==================\n    时间丨${time}\n`;
  }
  return out;
}

async function cetusTime() {
  const data = await getJsonData("cetus");
  if (!data) return "暂无数据";

  const cetusIsDay = data.day ?? data.isDay ?? null;
  const cetusTime = data.cetusTime;
  if (!cetusTime) return "赛特斯时间数据无效";

  let expiryTime = moment.unix(cetusTime);
  const currentTime = moment();

  if (currentTime.isAfter(expiryTime)) {
    cetusIsDay = !cetusIsDay;
    if (cetusIsDay) {
      expiryTime = expiryTime.add(100, "m");
    } else {
      expiryTime = expiryTime.add(50, "m");
    }
  }

  const state = cetusIsDay ? "白天 ☀️" : "黑夜 🌙";

  const nextChange = expiryTime.format("llll");

  return `         🌍地球平原🌍
========================
当前状态：${state}
剩余时间：${calculationNowTimeDiff(expiryTime.unix())}
交替时间：${nextChange}
========================
☀️时间可能会有1~2分钟误差🌙
`;
}

async function earthTime() {
  const data = await getJsonData("earth");
  if (!data) return "暂无地球时间数据";
  const day = data.day;
  let expiryTime = data.earthDate;
  const currentTime = moment().unix();
  if (currentTime > expiryTime) {
    cetusIsDay = !cetusIsDay;
    expiryTime = moment(expiryTime * 1000)
      .add(4, `h`)
      .unix();
  }

  return `         🌍地球 🌍       \n======================\n\n${
    day ? "白天 ☀️" : "黑夜 🌙"
  }剩余丨${calculationNowTimeDiff(expiryTime)}\n\n交替将于丨${moment(
    expiryTime
  ).format(`llll`)}`;
}

async function fissures() {
  const data = await getJsonData("fissures");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无裂隙信息";
  let out = "         裂隙        \n";
  let t1 = "";
  let t2 = "";
  let t3 = "";
  let t4 = "";
  let t5 = "";
  for (const f of data) {
    if (f.modifier.includes("T1")) {
      t1 += `${f.modifier} 丨 ${f.missionType} 丨 ${f.node} 丨 ${
        f.expiry ? calculationNowTimeDiff(f.expiry) : "-"
      }\n`;
      continue;
    } else if (f.modifier.includes("T2")) {
      t2 += `${f.modifier} 丨 ${f.missionType} 丨 ${f.node} 丨 ${
        f.expiry ? calculationNowTimeDiff(f.expiry) : "-"
      }\n`;
      continue;
    } else if (f.modifier.includes("T3")) {
      t3 += `${f.modifier} 丨 ${f.missionType} 丨 ${f.node} 丨 ${
        f.expiry ? calculationNowTimeDiff(f.expiry) : "-"
      }\n`;
      continue;
    } else if (f.modifier.includes("T4")) {
      t4 += `${f.modifier} 丨 ${f.missionType} 丨 ${f.node} 丨 ${
        f.expiry ? calculationNowTimeDiff(f.expiry) : "-"
      }\n`;
      continue;
    } else {
      t5 += `${f.modifier} 丨 ${f.missionType} 丨 ${f.node} 丨 ${
        f.expiry ? calculationNowTimeDiff(f.expiry) : "-"
      }\n`;
    }
  }
  out +=
    "-----丽斯(古纪)-----\n" +
    t1 +
    "-----美索(前纪)-----\n" +
    t2 +
    "-----尼奥(中纪)-----\n" +
    t3 +
    "-----亚希(后记)-----\n" +
    t4 +
    "-----安魂......-----\n" +
    t5;

  return out;
}

async function trader() {
  const voidTrader = await getJsonData("trader");
  let arriveTitle;
  let arriveNode;
  let arriveTime;
  if (voidTrader) {
    const expiryTime = voidTrader.expiry;
    const activateTime = voidTrader.activation;
    const currentTime = moment().unix();

    if (currentTime < activateTime) {
      arriveTime = moment.unix(activateTime).format(`llll`);
      arriveTitle = `${voidTrader.character} 预计到达:`;
      arriveNode = `到达在:${voidTrader.node}`;
    } else if (currentTime > activateTime && currentTime < expiryTime) {
      arriveTitle = `${voidTrader.character} 滞留时间:`;
      arriveTime = `离开在:` + moment.unix(expiryTime).format(`llll`);
    } else {
      arriveTitle = `${voidTrader.character} 已离开`;
      arriveTime = ``;
    }
  } else {
    return "暂无奸商信息";
  }

  return `
    💰奸商💰       
==================
${arriveTitle}\n
${arriveNode}\n
${arriveTime}\n
==================`;
}

async function sortie() {
  const sortie = await getJsonData("sortie");
  if (!sortie) return "暂无突击信息";
  if (sortie.variants.length !== 0) {
    let startTime = sortie.activation;
    let expiry = sortie.expiry;

    let out = `
          突击        
  ==================
  ${sortie.boss || ""} : ${expiry ? calculationNowTimeDiff(expiry) : "-"}
  \n${sortie.faction || ""}\n`;
    if (sortie.variants && sortie.variants.length) {
      for (const v of sortie.variants) {
        out += `\n\t${v.missionType} 丨 ${v.node} 丨 ${
          v.modifierType || v.modifier
        }\n`;
      }
    }
    out += `\n  开始时间丨${
      startTime ? moment.unix(startTime).format(`llll`) : "-"
    }\n  结束时间丨${expiry ? moment.unix(expiry).format(`llll`) : "-"}\n`;
    return out;
  } else {
    return "暂无突击信息";
  }
}

async function deals() {
  const data = await getJsonData("deals");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无今日优惠";
  let out = "         今日优惠        \n==================\n";
  for (const d of data) {
    const expiry = d.expiry;
    out += `${d.item || d.name} 丨 ${d.discount || "-"}%折扣 丨 ${
      d.salePrice || "-"
    } 白金 丨 剩余 ${expiry ? calculationNowTimeDiff(expiry) : "-"}\n`;
    out +=
      "上次刷新时间丨" +
      (d.activation ? moment.unix(d.activation).format(`llll`) : "-") +
      "\n";
    out +=
      "结束时间丨" + (expiry ? moment.unix(expiry).format(`llll`) : "-") + "\n";
    out += "==================\n";
  }

  return out;
}

async function invasions() {
  const invasions = await getJsonData("invasions");
  if (!invasions || !Array.isArray(invasions) || invasions.length === 0)
    return "暂无入侵信息";
  let attackPercent = Math.floor(
    ((invasions.count + invasions.goal) / (invasions.goal * 2)) * 100
  );
  let defendPercent = 100 - attackPercent;

  let out = "         入侵        \n==================\n";
  for (const inv of invasions) {
    out += `${inv.node || "-"} 丨 ${inv.locTag || "-"} \n`;
    if (inv.attacker && inv.attacker.rewards) {
      out += `攻击方${inv.attacker.faction} 进度：${attackPercent}%`;
      out += "奖励：\n";
      for (const r of inv.attacker.rewards)
        out += `  ${r.item} * ${r.itemCount}\n`;
    }
    if (inv.defender && inv.defender.rewards) {
      out += `防守方${inv.defender.faction} 进度：${defendPercent}%`;
      out += "奖励：\n";
      for (const r of inv.defender.rewards)
        out += `  ${r.item} * ${r.itemCount}\n`;
    }
    out += "------------------\n";
  }
  return out;
}

async function events() {
  const data = await getJsonData("events");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无事件";
  let out = "         事件        \n==================\n";
  for (const ev of data) {
    const expiry = ev.expiry;
    out += `(${ev.tag || ev.name}) 距离结束丨${
      expiry ? calculationNowTimeDiff(expiry) : "-"
    } | 已完成 ${ev.healthPct ?? ev.completed ?? "-"}%\n`;
  }
  return out;
}

async function season() {
  const data = await getJsonData("season");
  if (!data) return "暂无电波任务";
  if (data.challenges && data.challenges.length) {
    let out = "         电波任务        \n==================\n";
    for (const c of data.challenges) {
      out += `${c.cycle || ""} 丨 ${c.xp || ""} xp 丨 ${
        c.challenge || c.description || ""
      }\n`;
    }
    return out;
  }
  return JSON.stringify(data, null, 2);
}

async function bounty() {
  const data = await getJsonData("bounty");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无赏金信息";
  let out = "         赏金        \n==================\n";
  for (const b of data) {
    const expiry = b.expiry;
    out += `${b.tag || b.name}   剩余时间：${
      expiry ? calculationNowTimeDiff(expiry) : "-"
    }\n`;
    if (b.jobs) {
      for (const job of b.jobs) {
        out += `\t${job.jobType} \n\t\t奖励：${(job.rewards || job.reward || "")
          .toString()
          .replaceAll("<br />", "、")}\n`;
      }
    }
    out += "==================\n";
  }
  return out;
}

// ----- 通用工具 -----
async function getJsonData(url_arg) {
  const api_url = url + url_arg;
  // 如果目标为 https，使用允许过期/自签名证书的 agent（仅针对此请求），以支持证书过期场景
  const agent = api_url.startsWith("https:")
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;
  const resp = await fetch(api_url, { timeout: 10000, agent });
  return await resp.json();
}

// 计算目标时间与当前时间的差值
function calculationNowTimeDiff(time) {
  // 兼容时间戳（秒）或时间字符串
  const target =
    typeof time === "number" && time < 1e12
      ? moment(time * 1000)
      : moment(time);

  let diff = target.diff(moment()); // 目标时间 - 当前时间
  if (diff < 0) diff = -diff; // 如果是过去时间，取绝对值

  const duration = moment.duration(diff);
  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
}
