import fetch from "node-fetch";
import Config from "../components/Config.js";

/*
 * @description: read60s推送
 * @author: lycoris
 * @date: undefined
 */
const config = Config.getConfig("config");

const DEFAULT_SUFFIX = [
  "https://60s.tmini.net",
  "https://cqxx.site",
  "https://60s.crystelf.top",
  "https://60s.zeabur.app",
  "http://60api.09cdn.xyz",
];

const API_CONFIG = {
  DEFAULT: "/v2/60s?type=json",
  BACKUP1: "https://api.jun.la/60s.php?format=imgapi",
  BACKUP2: {
    url: "https://v2.alapi.cn/api/zaobao",
    token: "yTrBjcOSMko6kIEL",
  },
  BACKUP3: "https://api.03c3.cn/api/zb?type=jsonImg",
  BACKUP4: "https://api.j4u.ink/v1/store/other/proxy/remote/news/60.json",
};

const plugin_config = config.read60s;
const CRON_EXPRESSION = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`;

// 请求超时与重试配置
const REQUEST_TIMEOUT = 5000; // ms
const REQUEST_RETRY = 2;

// helper: sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// helper: fetch with retries and timeout using AbortController (module-level)
async function fetchWithRetry(url, attempts = REQUEST_RETRY, timeout = REQUEST_TIMEOUT) {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (err) {
      clearTimeout(id);
      logger && logger.warn && logger.warn(`Request to ${url} failed (attempt ${i + 1}/${attempts}): ${err.name || err.message}`);
      if (i < attempts - 1) await sleep(300);
    }
  }
  throw new Error(`Failed to fetch ${url} after ${attempts} attempts`);
}

export class Read60sPlugin extends plugin {
  constructor() {
    super({
      name: "60S新闻",
      dsc: "获取60S新闻，并定时推送",
      event: "message",
      priority: 1200,
      rule: [
        // 支持：#news、news、今日新闻、60S新闻、早报，大小写容错；可选尾号 1-4（例如：#news2 或 今日新闻3）
        {
          reg: "^#?\\s*(?:今日\\s*)?(?:60S|60s|News|news|NEWS|新闻|早报)(?:[1-4])?$",
          fnc: "getRead60sNews",
        },
      ],
    });
    this.task = {
      name: "read60s定时推送",
      fnc: () => this.sendRandomImage(),
      cron: CRON_EXPRESSION,
    };
  }

  // 通用的新闻获取和回复方法
  async handleNewsRequest(e, fetchFunction) {
    try {
      const imgMsg = await fetchFunction();
      if (imgMsg) {
        await e.reply(imgMsg);
        return true;
      }
    } catch (error) {
      logger.error("获取新闻失败:", error);
    }
    await e.reply("没有获取到今日新闻！");
    return false;
  }

  // 通用的图片获取方法
  async fetchImageFromApi(url, dataProcessor) {
    const response = await axios.get(url);
    return dataProcessor(response.data);
  }

  async getRead60sNews(e) {
    const text = (e.msg || e.message || "").trim();
    // 匹配末尾数字 1-4
    const m = text.match(/([1-4])\s*$/);
    const idx = m ? parseInt(m[1], 10) : 0;
    switch (idx) {
      case 1:
        return this.getRead60sNews1(e);
      case 2:
        return this.getRead60sNews2(e);
      case 3:
        return this.getRead60sNews3(e);
      case 4:
        return this.getRead60sNews4(e);
      default:
        return this.handleNewsRequest(e, getNewsImage);
    }
  }

  async getRead60sNews1(e) {
    const fetchImage = async () => {
      const response = await fetchWithRetry(API_CONFIG.BACKUP1);
      const data = await response.json();
      let imageUrl = data.imageBaidu || data.imageUrl || data.data?.image;
      return segment.image(imageUrl);
    };
    return this.handleNewsRequest(e, fetchImage);
  }

  async getRead60sNews2(e) {
    const fetchImage = async () => {
      const url = `${API_CONFIG.BACKUP2.url}?format=json&token=${API_CONFIG.BACKUP2.token}`;
      const response = await fetchWithRetry(url);
      const data = await response.json();
      return segment.image(data.data?.image || data.image);
    };
    return this.handleNewsRequest(e, fetchImage);
  }

  async getRead60sNews3(e) {
    const fetchImage = async () => {
      const response = await fetchWithRetry(API_CONFIG.BACKUP3);
      const data = await response.json();
      return segment.image(data.data?.imageurl || data.imageurl || data.image);
    };
    return this.handleNewsRequest(e, fetchImage);
  }

  async getRead60sNews4(e) {
    const fetchImage = async () => {
      const response = await fetchWithRetry(API_CONFIG.BACKUP4);
      const data = (await response.json()).data;
      const dateInfo = this.formatDateInfo(data);
      const imgMsg = segment.image(data.image);
      return { imgMsg, dateInfo };
    };

    try {
      const { imgMsg, dateInfo } = await fetchImage();
      await e.reply(imgMsg);
      await e.reply(dateInfo);
      return true;
    } catch (error) {
      logger.error("获取新闻失败:", error);
      await e.reply("没有获取到今日新闻！");
      return false;
    }
  }

  formatDateInfo(data) {
    return `
        日期：${data.date}
        星期：${data.weekDay}
        年份：${data.yearTip}
        类型：${data.typeDes}
         属 ：${data.chineseZodiac}
        节气：${data.solarTerms}
        农历：${data.lunarCalendar}
        宜：${data.suit}
        忌：${data.avoid}
        星座：${data.constellation}
        天数：${data.daysOfYear}
        周数：${data.weekOfYear}
        `;
  }

  async sendRandomImage() {
    if (!plugin_config.isPush) return;
    try {
      const message = await getNewsImage();
      const sendPromises = [
        ...plugin_config.private_ids.map((qq) =>
          Bot.sendPrivateMsg(qq, message).catch((err) => logger.error(err))
        ),
        ...plugin_config.group_ids.map((qqGroup) =>
          Bot.sendGroupMsg(qqGroup, message).catch((err) => logger.error(err))
        ),
      ];
      await Promise.all(sendPromises);
    } catch (error) {
      logger.error("Error sending messages:", error);
    }
  }
}

async function getNewsImage() {
  // 构造尝试列表：先尝试 DEFAULT_SUFFIX + API_CONFIG.DEFAULT（短超时，少次重试），
  // 若全部失败，再尝试备份 API。
  const apis = [];

  // 如果 DEFAULT 是以 '/' 开头的路径，则把每个 DEFAULT_SUFFIX 拼接成完整 URL
  if (API_CONFIG.DEFAULT && API_CONFIG.DEFAULT.startsWith('/')) {
    for (const prefix of DEFAULT_SUFFIX) {
      if (!prefix) continue;
      const trimmed = prefix.replace(/\/$/, '');
      const fullUrl = trimmed + API_CONFIG.DEFAULT;
      apis.push({
        url: fullUrl,
        attempts: 1,
        timeout: 3000,
        process: (data) => {
          if (data && data.data && data.data.image) return segment.image(data.data.image);
          // 有些镜像可能直接返回 data.image 或 image 字段
          if (data && (data.image || data.data?.img)) return segment.image(data.image || data.data.img);
          throw new Error('默认镜像返回格式异常');
        },
      });
    }
  } else if (API_CONFIG.DEFAULT) {
    // 如果 DEFAULT 是完整 URL，直接使用
    apis.push({ url: API_CONFIG.DEFAULT, attempts: 1, timeout: 3000, process: (data) => {
      if (data && data.data && data.data.image) return segment.image(data.data.image);
      throw new Error('默认 API 返回格式异常');
    }});
  }

  // 备份源（保留原有解析行为）
  apis.push({ url: API_CONFIG.BACKUP1, attempts: REQUEST_RETRY, timeout: REQUEST_TIMEOUT, process: (data) => segment.image(data.imageBaidu || data.imageUrl) });
  apis.push({ url: `${API_CONFIG.BACKUP2.url}?format=json&token=${API_CONFIG.BACKUP2.token}`, attempts: REQUEST_RETRY, timeout: REQUEST_TIMEOUT, process: (data) => segment.image(data.data.image) });

  // use module-level sleep and fetchWithRetry helpers

  for (const api of apis) {
    try {
      const response = await fetchWithRetry(api.url);
      const data = await response.json();
      return api.process(data);
    } catch (error) {
      logger.error(`API ${api.url} failed: ${error.message}`);
      continue;
    }
  }
  throw new Error("All APIs failed");
}
