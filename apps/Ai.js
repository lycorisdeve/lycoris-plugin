import Config from '../components/Config.js';
import Render from '../components/lib/Render.js';
import Parser from 'rss-parser';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import fs from 'fs';

const newsConfig = Config.getConfig('config').aiNews || {
  isPush: true,
  schedule: {
    hour: '8',
    minute: '30',
    second: '0'
  },
  num: 20,
  group_ids: [],
  private_ids: []
};

const NEWS_CRON = `${newsConfig.schedule.second} ${newsConfig.schedule.minute} ${newsConfig.schedule.hour} * * *`;
const RSS_URL = 'https://justlovemaki.github.io/CloudFlare-AI-Insight-Daily/rss.xml';
const FETCH_TIMEOUT_MS = 10000;

const rankConfig = Config.getConfig('config').arenaRank || {
  isPush: true,
  schedule: {
    dayOfWeek: '1',
    hour: '8',
    minute: '0',
    second: '0'
  },
  group_ids: [],
  private_ids: []
};

const RANK_CRON = `${rankConfig.schedule.second} ${rankConfig.schedule.minute} ${rankConfig.schedule.hour} * * ${rankConfig.schedule.dayOfWeek}`;
const ARENA_URL = 'https://artificialanalysis.ai/';

export class Ai extends plugin {
  constructor() {
    super({
      name: 'AI资讯',
      dsc: 'AI新闻与模型排行榜查询、定时推送',
      event: 'message',
      priority: 2000,
      rule: [{
        reg: 'AI新闻|新闻推送',
        fnc: 'pushAiNews'
      }, {
        reg: 'AI排行|排行榜|AI模型排行',
        fnc: 'pushArenaRank'
      }]
    });
    this.task = [{
      name: 'aiNews定时推送',
      fnc: () => this.sendAiNews(),
      cron: NEWS_CRON
    }, {
      name: 'arenaRank定时推送',
      fnc: () => this.sendArenaRank(),
      cron: RANK_CRON
    }];
  }

  async pushAiNews(e) {
    const img = await this.getAiNewsImg();
    if (img) {
      await e.reply(img, false, { at: true });
    } else {
      await e.reply('AI新闻获取失败,请稍后再试', false, { at: true });
    }
  }

  async getAiNewsImg() {
    const { date, categories } = await this.getAiNewsFromRss();
    if (!categories.length) return null;

    // Calculate total news items to show in the meta tag
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

    const data = {
      newsTitle: `AI新闻_${date}`,
      totalItems,
      categories,
      copyright: ``,
      sys: {
        scale: 100,
        width: 1200,
        height: 1200,
        background: 'rgba(255,255,255,0.8)'
      }
    };
    return await Render.render('html/aiNews/aiNews', data);
  }

  async getAiNewsFromRss() {
    const xml = await this.fetchText(RSS_URL, FETCH_TIMEOUT_MS);
    if (!xml) return { date: new Date().toISOString().slice(0, 10), newsList: [] };

    return await this.parseRss(xml, newsConfig.num || 10);
  }

  async fetchText(url, timeoutMs) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs || FETCH_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.text();
    } catch (err) {
      return null;
    }
  }

  async parseRss(xmlText, limit) {
    try {
      const parser = new Parser({
        customFields: {
          item: ['content:encoded', 'description']
        }
      });
      const feed = await parser.parseString(xmlText);
      const items = Array.isArray(feed.items) ? feed.items : [];
      if (items.length === 0) return { date: new Date().toISOString().slice(0, 10), newsList: [] };

      // 只取第一条（最新一天）的日刊
      const first = items[0];
      const dateStr = first.isoDate || first.pubDate || '';
      const date = this.safeDate(dateStr) || new Date().toISOString().slice(0, 10);

      const content = first['content:encoded'] || first.content || first.description || '';

      const categories = [];
      const categoryRegex = /<h3>(.*?)<\/h3>[\s\S]*?<ol>([\s\S]*?)<\/ol>/g;
      let match;

      while ((match = categoryRegex.exec(content)) !== null) {
        const title = match[1].trim();
        const itemsHtml = match[2];
        const newsItems = [];

        const itemRegex = /<li>(.*?)<\/li>/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(itemsHtml)) !== null) {
          // 清除 <li> 内部的 a 标签等 html 实体
          const text = itemMatch[1].replace(/<[^>]*>?/gm, '').trim();
          if (text) newsItems.push(text);
        }

        if (newsItems.length > 0) {
          // Flatten items down to newsConfig limit if necessary, but visually it's best to show all items in the daily digest, so let's keep all parsed items for this day.
          categories.push({
            title: title,
            items: newsItems
          });
        }
      }

      return { date, categories };
    } catch (err) {
      return { date: new Date().toISOString().slice(0, 10), categories: [] };
    }
  }

  safeDate(input) {
    if (!input) return null;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  normalizeLine(line) {
    let out = String(line || '').replace(/[\r\n]+/g, ' ').trim();
    out = out.replace(/\s+/g, ' ');
    return out;
  }

  async sendAiNews() {
    if (!newsConfig.isPush) return;
    const img = await this.getAiNewsImg();
    if (!img) return;
    const sendPromises = [
      ...(newsConfig.private_ids || []).map(qq =>
        Bot.sendPrivateMsg(qq, img).catch(err => logger.error(err))
      ),
      ...(newsConfig.group_ids || []).map(groupId =>
        Bot.sendGroupMsg(groupId, img).catch(err => logger.error(err))
      )
    ];
    await Promise.all(sendPromises);
  }
  async pushArenaRank(e) {
    const img = await this.getArenaRankImg();
    if (img) {
      await e.reply(img, false, { at: true });
    } else {
      await e.reply('AI排行榜获取失败,请稍后再试', false, { at: true });
    }
  }

  async getArenaRankImg() {
    let browser = null;
    let tempFile = null;

    try {
      browser = await puppeteer.browserInit({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--disable-blink-features=AutomationControlled'
        ],
        ignoreHTTPSErrors: true,
        timeout: 60000,
        protocolTimeout: 60000
      });

      const page = await browser.newPage();

      // Inject standard User-Agent and evasions to bypass Cloudflare
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
      await page.setViewport({ width: 1920, height: 1080 });

      await page.setDefaultNavigationTimeout(60000);
      await page.setDefaultTimeout(60000);

      logger.info('[AI排行榜] 正在加载页面...');
      await page.goto(ARENA_URL, {
        waitUntil: 'networkidle2', // Use networkidle2 to account for lingering API calls
        timeout: 60000
      });

      logger.info('[AI排行榜] 页面加载完成，正在处理页面元素...');

      // 隐藏不需要的元素（如导航栏、页脚、Cookie提示框等）
      await page.evaluate(() => {
        const hideSelectors = ['nav', 'header', 'footer', '[role="dialog"]', '.cookie', '[id*="cookie"]'];
        hideSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            if (el) el.style.display = 'none';
          });
        });
      });

      logger.info('[AI排行榜] 正在截图...');

      tempFile = `./temp/arena_rank_${Date.now()}.png`;

      // 选取页面的主要内容部分进行截图，而不是整个长页面
      const mainElement = await page.$('main') || await page.$('body');
      await mainElement.screenshot({
        path: tempFile,
        type: 'png'
      });

      logger.info(`[AI排行榜] 截图已保存: ${tempFile}`);

      const img = segment.image(fs.readFileSync(tempFile));
      return img;
    } catch (error) {
      logger.error('[AI排行榜] 截图失败:', error);
      return null;
    } finally {
      if (browser) await browser.close();
      if (tempFile && fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  async sendArenaRank() {
    if (!rankConfig.isPush) return;
    const img = await this.getArenaRankImg();
    if (!img) return;
    const sendPromises = [
      ...(rankConfig.private_ids || []).map(qq =>
        Bot.sendPrivateMsg(qq, img).catch(err => logger.error(err))
      ),
      ...(rankConfig.group_ids || []).map(groupId =>
        Bot.sendGroupMsg(groupId, img).catch(err => logger.error(err))
      )
    ];
    await Promise.all(sendPromises);
  }
}
