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
      ],
    });
  }

  async menu(e) {
    let data = await HelpService.customHelp(e, "warframe_help");

    let img = await Render.render("help/index.html", data, { e, scale: 1.2 });
    e.reply(img);
    return;
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
        case "solaris":
          result = await plainCycle(endpoint);
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

      // 限制长度再回复
      const MAX = 1500;
      if (typeof result === "string") {
        if (result.length > MAX)
          result = result.slice(0, MAX) + "\n...[已截断]";
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
    const diff = expiry ? expiry.getTime() - Date.now() : null;
    out += `剩余时间丨${diff ? calculationNowTimeDiff(diff) : "-"}\n`;
    out += "==================\n";
  }
  return out;
}

async function news() {
  const data = await getJsonData("news");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无新闻";
  let out = "        飞船新闻       \n==================\n";
  for (const n of data) {
    let time = n.date ? moment.unix(n.data).format("YYYY-MM-DD HH:mm:ss") : "";
    const msg = n.message || n.defaultMessages || n.body || "(无正文)";
    const link = n.link || n.prop || "";
    out += `${msg}\n\n时间丨${time}\n链接丨${link}\n==================\n`;
  }
  return out;
}
async function cetusTime() {
  // 获取赛特斯数据
  const data = await getJsonData("cetus");
  if (!data) return "暂无数据";

  const isDay = data.day ?? data.isDay ?? null; // 当前是否白天
  const cetusTime = data.cetusTime ?? data.expiry ?? null; // 结束时间戳（秒）
  if (!cetusTime) return "赛特斯时间数据无效";

  // 当前时间（秒）
  const now = moment().unix();

  // 计算剩余时间
  const diff = (cetusTime - now) * 1000; // 转为毫秒
  const duration = moment.duration(diff);

  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  // 判断状态
  const state = isDay ? "白天 ☀️" : "黑夜 🌙";

  // 格式化交替时间
  const nextChange = moment.unix(cetusTime).format("YYYY-MM-DD HH:mm:ss");

  return `🌍地球平原
====================
当前状态：${state}
剩余时间：${hours}小时 ${minutes}分 ${seconds}秒
交替时间：${nextChange}`;
}

async function earthTime() {
  const data = await getJsonData("earth");
  if (!data) return "暂无地球时间数据";
  const day = data.day ?? data.isDay ?? false;
  const earthTime = data.earthDate ?? data.expiry ?? null;
  const changeTime = earthTime ? moment().add(earthTime, "milliseconds") : null;

  return `         地球        \n======================\n\n${
    day ? "白天" : "黑夜"
  }剩余丨${t ? formatTimeDiff(earthTime) : "-"}\n\n交替将于丨${
    changeTime ? changeTime.format("YYYY-MM-DD HH:mm:ss") : ""
  }`;
}

async function fissures() {
  const data = await getJsonData("fissures");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无裂隙信息";
  let out = "         裂隙        \n";
  for (const f of data) {
    const expiry = f.expiry;
    out += `${f.modifier} 丨 ${f.missionType} 丨 ${f.node} 丨 ${
      expiry ? calculationNowTimeDiff(expiry) : "-"
    }\n`;
  }
  return out;
}

async function trader() {
  const data = await getJsonData("trader");
  if (!data) return "暂无奸商信息";
  const now = Date.now();
  let remain = "-";
  try {
    const act = data.activation ?? data.activationnew ?? null;
    const exp = data.expiry ?? null;
    if (act && now < act) remain = formatTimeDiff(act - now);
    else if (exp) remain = formatTimeDiff(exp - now);
  } catch (e) {}
  return `         奸商        \n==================\n\n${
    data.character || data.name || "(未知)"
  }\n\n地点丨${
    data.node || data.location || "-"
  }\n\n剩余丨${remain}\n\n==================`;
}

async function sortie() {
  const data = await getJsonData("sortie");
  if (!data) return "暂无突击信息";
  const expiry = data.expiry;
  let out = `         突击        \n==================\n\n${
    data.boss || ""
  } : ${expiry ? calculationNowTimeDiff(expiry) : "-"}\n\n${
    data.faction || ""
  }\n`;
  if (data.variants && data.variants.length) {
    for (const v of data.variants) {
      out += `\n\t${v.missionType} 丨 ${v.node} 丨 ${
        v.modifierType || v.modifier
      }\n`;
    }
  }
  return out;
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
  }
  return out;
}

async function invasions() {
  const data = await getJsonData("invasions");
  if (!data || !Array.isArray(data) || data.length === 0) return "暂无入侵信息";
  let out = "         入侵        \n==================\n";
  for (const inv of data) {
    out += `${inv.node || "-"} 丨 ${inv.locTag || "-"} \n`;
    if (inv.attacker && inv.attacker.rewards) {
      out += "攻击方奖励：\n";
      for (const r of inv.attacker.rewards)
        out += `  ${r.item} * ${r.itemCount}\n`;
    }
    if (inv.defender && inv.defender.rewards) {
      out += "防守方奖励：\n";
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
  let out = "         事件        \n";
  for (const ev of data) {
    const expiry = ev.expiry;
    out += `(${ev.tag || ev.name}) 距离结束丨${
      expiry ? calculationNowTimeDiff(expiry) : "-"
    } | 已完成 ${ev.healthPct ?? ev.completed ?? "-"}\n`;
  }
  return out;
}

async function season() {
  const data = await getJsonData("season");
  if (!data) return "暂无电波任务";
  if (data.challenges && data.challenges.length) {
    let out = "         电波任务        \n";
    for (const c of data.challenges) {
      out += `${c.cycle || ""} 丨 ${c.xp || ""}xp 丨 ${
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

async function getFormatHms(time) {
  var myDate = new Date(time);
  var H = myDate.getHours();
  var i = myDate.getMinutes();
  var s = myDate.getSeconds();
  if (H < 10) H = "0" + H;
  if (i < 10) i = "0" + i;
  if (s < 10) s = "0" + s;
  return H + "时" + i + "分" + s + "秒";
}

function formatTimeDiff(diff) {
  const units = [
    { unit: 86400000, suffix: "天" }, // 天
    { unit: 3600000, suffix: "小时" }, // 小时
    { unit: 60000, suffix: "分钟" }, // 分钟
    { unit: 1000, suffix: "秒" }, // 秒
  ];

  const stringArray = [];

  // 通过单位数组进行遍历，计算时间差
  for (const { unit, suffix } of units) {
    const time = Math.floor(diff / unit); // 计算当前时间单位
    if (time > 0 || stringArray.length > 0) {
      // 如果当前时间单位大于0，或者已经有结果
      stringArray.push(time.toString().padStart(2, "0") + suffix); // 格式化并加入结果数组
    }
    diff -= time * unit; // 减去已计算的时间部分
  }

  return stringArray.join(" "); // 用空格连接最终的时间字符串
}

function calculationTimeDifference(time1, time2) {
  moment.unix(time1);
  moment.unix(time2);
  const diff = moment.duration(time2 - time1);
  const days = diff.days();
  const hours = diff.hours();
  const minutes = diff.minutes();
  const seconds = diff.seconds();
  return {
    diff: diff,
    stringDate: `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`,
  };
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
