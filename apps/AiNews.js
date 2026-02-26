import Config from '../components/Config.js';
import Render from '../components/lib/Render.js';
import Parser from 'rss-parser';

const config = Config.getConfig('config').aiNews || {
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

const CRON_EXPRESSION = `${config.schedule.second} ${config.schedule.minute} ${config.schedule.hour} * * *`;
const RSS_URL = 'https://justlovemaki.github.io/CloudFlare-AI-Insight-Daily/rss.xml';
const FETCH_TIMEOUT_MS = 10000;

export class AiNews extends plugin {
  constructor() {
    super({
      name: 'AI新闻推送',
      dsc: '每日AI新闻自动推送',
      event: 'message',
      priority: 2000,
      rule: [{
        reg: 'AI新闻|新闻推送',
        fnc: 'pushAiNews'
      }]
    });
    this.task = {
      name: 'aiNews定时推送',
      fnc: () => this.sendAiNews(),
      cron: CRON_EXPRESSION
    };
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

    return await this.parseRss(xml, config.num || 10);
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
          // Flatten items down to config limit if necessary, but visually it's best to show all items in the daily digest, so let's keep all parsed items for this day.
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
    if (!config.isPush) return;
    const img = await this.getAiNewsImg();
    if (!img) return;
    const sendPromises = [
      ...(config.private_ids || []).map(qq =>
        Bot.sendPrivateMsg(qq, img).catch(err => logger.error(err))
      ),
      ...(config.group_ids || []).map(groupId =>
        Bot.sendGroupMsg(groupId, img).catch(err => logger.error(err))
      )
    ];
    await Promise.all(sendPromises);
  }
}

