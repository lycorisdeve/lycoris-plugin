import Config from "../components/Config.js";

const config = Config.getConfig("config");

const plugin_config = config.moyu;
const CRON_EXPRESSION = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`;
const isPush = config.moyu.isPush;
const FETCH_TIMEOUT = 8000; // ms

export class MoyuCalendarPlugin extends plugin {
  constructor() {
    super({
      /** 功能名称 */
      name: "摸鱼日历",
      /** 功能描述 */
      dsc: "获取摸鱼日历，并定时推送",
      /** https://oicqjs.github.io/oicq/#events */
      event: "message",
      /** 优先级，数字越小等级越高 */
      priority: 1200,
      rule: [
        {
          /** 命令正则匹配 */
          reg: "^#摸鱼日历$",
          /** 执行方法 */
          fnc: "replyMoyuCalendar",
        },
      ],
    });
    this.task = {
      /** 任务名 */
      name: "read60s定时推送",
      /** 任务方法名 */
      fnc: () => this.sendCornMoyuImage(),
      /** 任务cron表达式 */
      cron: CRON_EXPRESSION,
    };
  }

  async sendCornMoyuImage() {
    if (!isPush) {
      return;
    }
    try {
      let message = "摸鱼日历";
      let img = await getCalendarPrimary();
      if (img != false) {
        message = segment.image(img);
      } else {
        message = "摸鱼日历获取失败，请稍后使用 #摸鱼日历 手动获取 ！";
      }

      for (const qq of plugin_config.private_ids) {
        Bot.sendPrivateMsg(qq, message).catch((err) => {
          logger.error(err);
        });
        await nonebot.get_bot().sendPrivateMsg(qq, message);
      }

      for (const qqGroup of plugin_config.group_ids) {
        Bot.sendGroupMsg(qqGroup, message).catch((err) => {
          logger.error(err);
        });
      }
    } catch (error) {
      logger.error("Error sending messages:", error);
    }
  }

  async replyMoyuCalendar(e) {
    let img = await getCalendarPrimary();
    if (img != false) {
      e.reply(segment.image(img));
    } else {
      e.reply("摸鱼日历获取失败，请稍后重试！");
    }
  }
  async replyMoyuCalendar2(e) {
    // 专门使用 zxki 源（规则里有该命令）
    let img = await getCalendarFromzxki();
    if (img != false) {
      e.reply(segment.image(img));
    } else {
      e.reply("摸鱼日历（ZXKI）获取失败，尝试备用源...");
      // 回退到主源
      let fallback = await getCalendarPrimary();
      if (fallback) e.reply(segment.image(fallback));
    }
  }
}

async function getCalendarFromJ4u() {
  try {
    let url = "https://api.j4u.ink/v1/store/other/proxy/remote/moyu.json";
    // 发起第一个GET请求，明确不跟随重定向
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT).then((rs) =>
      rs.json()
    );
    if (
      response &&
      response.code == 200 &&
      response.data &&
      response.data.img_url
    ) {
      return response.data.img_url;
    }
    return false;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}
async function getCalendarFromVvhan() {
  try {
    let url = "https://api.vvhan.com/api/moyu?type=json";
    // 发起第一个GET请求，明确不跟随重定向
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT).then((rs) =>
      rs.json()
    );
    if (response && response.success && response.url) {
      return response.url;
    }
    return false;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}
async function getCalendarFromzxki() {
  try {
    let url = "https://api.zxki.cn/api/myrl?type=json";
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT).then((rs) =>
      rs.json()
    );
    if (
      response &&
      (response.success === true || response.code === 200) &&
      response.url
    ) {
      return response.url;
    }
    return false;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

// 通用带超时的 fetch
async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// 主尝试逻辑：按优先级依次尝试多个源，返回第一个有效图片URL
async function getCalendarPrimary() {
  const sources = [
    getCalendarFromJ4u,
    getCalendarFromVvhan,
    getCalendarFromzxki,
  ];
  for (const fn of sources) {
    try {
      const url = await fn();
      if (url) return url;
    } catch (err) {
      logger &&
        logger.warn &&
        logger.warn("摸鱼日历源尝试失败：", err.message || err);
      // continue try next
    }
  }
  return false;
}
