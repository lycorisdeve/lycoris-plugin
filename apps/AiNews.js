import Config from '../components/Config.js';
import Render from '../components/lib/Render.js';
import { pluginName } from '../components/lib/Path.js';
import Parser from 'rss-parser';

const config = Config.getConfig('config').aiNews || {
  isPush: true,
  schedule: {
    hour: '8',
    minute: '30',
    second: '0'
  },
  num: 10,
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
    const { date, newsList } = await this.getAiNewsFromRss();
    if (!newsList.length) return null;
    const data = {
      newsTitle: `AI新闻_${date}`,
      news: newsList.map(title => ({ title })),
      copyright: `${pluginName}`,
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
      const parser = new Parser();
      const feed = await parser.parseString(xmlText);
      const items = Array.isArray(feed.items) ? feed.items : [];
      const titles = [];
      for (const item of items) {
        if (item && item.title) {
          const t = this.normalizeLine(item.title);
          if (t) titles.push(t);
        }
        if (titles.length >= limit) break;
      }
      const first = items[0] || {};
      const dateStr = first.isoDate || first.pubDate || '';
      const date = this.safeDate(dateStr) || new Date().toISOString().slice(0, 10);
      return { date, newsList: titles.slice(0, limit) };
    } catch (err) {
      return { date: new Date().toISOString().slice(0, 10), newsList: [] };
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
