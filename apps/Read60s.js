import fetch from "node-fetch";
import Config from "../components/Config.js";

/*
 * @description: read60s推送
 * @author: lycoris
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

const REQUEST_TIMEOUT = 5000; // ms
const REQUEST_RETRY = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
      logger?.warn?.(`Request to ${url} failed (${i + 1}/${attempts}): ${err.name || err.message}`);
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

  // 修正版：容错空图片判断
  async handleNewsRequest(e, fetchFunction) {
    try {
      const imgMsg = await fetchFunction();
      if (imgMsg) {
        if (typeof imgMsg === "object" && imgMsg.type === "image") {
          const filePath = imgMsg.file || imgMsg.data?.file;
          if (!filePath) {
            logger?.warn?.(`fetchFunction 返回了无效的 image payload: ${JSON.stringify(imgMsg)}`);
            throw new Error("空图片返回");
          }
        }
        await e.reply(imgMsg);
        return true;
      }
    } catch (error) {
      logger.error("获取新闻失败:", error);
    }
    await e.reply("没有获取到今日新闻！");
    return false;
  }

  // 改为 fetch 实现
  async fetchImageFromApi(url, dataProcessor) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return dataProcessor(data);
  }

  async getRead60sNews(e) {
    const text = (e.msg || e.message || "").trim();
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
      const imageUrl = data.imageBaidu || data.imageUrl || data.data?.image;
      if (!imageUrl) throw new Error("备份源1未返回有效图片");
      return segment.image(imageUrl);
    };
    return this.handleNewsRequest(e, fetchImage);
  }

  async getRead60sNews2(e) {
    const fetchImage = async () => {
      const url = `${API_CONFIG.BACKUP2.url}?format=json&token=${API_CONFIG.BACKUP2.token}`;
      const response = await fetchWithRetry(url);
      const data = await response.json();
      const imageUrl = data.data?.image || data.image;
      if (!imageUrl) throw new Error("备份源2未返回有效图片");
      return segment.image(imageUrl);
    };
    return this.handleNewsRequest(e, fetchImage);
  }

  async getRead60sNews3(e) {
    const fetchImage = async () => {
      const response = await fetchWithRetry(API_CONFIG.BACKUP3);
      const data = await response.json();
      const imageUrl = data.data?.imageurl || data.imageurl || data.image;
      if (!imageUrl) throw new Error("备份源3未返回有效图片");
      return segment.image(imageUrl);
    };
    return this.handleNewsRequest(e, fetchImage);
  }

  async getRead60sNews4(e) {
    const fetchImage = async () => {
      const response = await fetchWithRetry(API_CONFIG.BACKUP4);
      const data = (await response.json()).data;
      if (!data || !data.image) throw new Error("备份源4未返回有效图片");
      const imgMsg = segment.image(data.image);
      const dateInfo = this.formatDateInfo(data);
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
属相：${data.chineseZodiac}
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
      logger.info("[60S新闻] 定时推送图片结构:", message);
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
  const apis = [];

  if (API_CONFIG.DEFAULT && API_CONFIG.DEFAULT.startsWith("/")) {
    for (const prefix of DEFAULT_SUFFIX) {
      const fullUrl = `${prefix.replace(/\/$/, "")}${API_CONFIG.DEFAULT}`;
      apis.push({
        url: fullUrl,
        attempts: 1,
        timeout: 3000,
        process: (data) => {
          const img = data?.data?.image || data?.image || data?.data?.img;
          if (!img) throw new Error("默认镜像返回格式异常");
          return segment.image(img);
        },
      });
    }
  } else if (API_CONFIG.DEFAULT) {
    apis.push({
      url: API_CONFIG.DEFAULT,
      attempts: 1,
      timeout: 3000,
      process: (data) => {
        const img = data?.data?.image;
        if (!img) throw new Error("默认 API 返回格式异常");
        return segment.image(img);
      },
    });
  }

  apis.push({
    url: API_CONFIG.BACKUP1,
    attempts: REQUEST_RETRY,
    timeout: REQUEST_TIMEOUT,
    process: (data) => {
      const imageUrl = data?.imageBaidu || data?.imageUrl || data?.data?.image || data?.image;
      if (!imageUrl) throw new Error("备份1未返回有效图片");
      return segment.image(imageUrl);
    },
  });

  apis.push({
    url: `${API_CONFIG.BACKUP2.url}?format=json&token=${API_CONFIG.BACKUP2.token}`,
    attempts: REQUEST_RETRY,
    timeout: REQUEST_TIMEOUT,
    process: (data) => {
      const imageUrl = data?.data?.image || data?.image;
      if (!imageUrl) throw new Error("备份2未返回有效图片");
      return segment.image(imageUrl);
    },
  });

  for (const api of apis) {
    try {
      const response = await fetchWithRetry(api.url, api.attempts, api.timeout);
      const data = await response.json();
      const result = api.process(data);
      logger.info("[60S新闻] 获取成功的图片结构:", result);
      return result;
    } catch (error) {
      logger.error(`API ${api.url} failed: ${error.message}`);
    }
  }
  throw new Error("All APIs failed");
}
