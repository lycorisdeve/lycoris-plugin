
import Config from '../components/Config.js';
import Render from '../components/lib/Render.js';
import { pluginName } from '../components/lib/Path.js';

const config = Config.getConfig('config').aiNews || {
  isPush: true,
  schedule: {
    hour: '8',
    minute: '30',
    second: '0'
  },
  group_ids: [],
  private_ids: []
};

const CRON_EXPRESSION = `${config.schedule.second} ${config.schedule.minute} ${config.schedule.hour} * * *`;

let _path = process.cwd();

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
      await e.reply('AI新闻获取失败，请稍后再试！');
    }
  }

  async getAiNewsImg() {
    const date = new Date().toISOString().slice(0, 10);
    const url = `https://www.aicpb.com/api/dailyReports/get?date=${date}`;
    let newsList = [];
    try {
      const res = await fetch(url);
      const json = await res.json();
      newsList = (json.data && Array.isArray(json.data.news)) ? json.data.news.filter(item => item && item.title) : [];
    } catch (err) {
      return null;
    }
    const data = {
      newsTitle: `AI新闻_${date}`,
      news: newsList,
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
