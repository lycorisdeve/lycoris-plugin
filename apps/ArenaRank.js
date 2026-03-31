import Config from '../components/Config.js';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import fs from 'fs';

const config = Config.getConfig('config').arenaRank || {
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

const CRON_EXPRESSION = `${config.schedule.second} ${config.schedule.minute} ${config.schedule.hour} * * ${config.schedule.dayOfWeek}`;
const ARENA_URL = 'https://arena.ai/leaderboard/';

export class ArenaRank extends plugin {
  constructor() {
    super({
      name: 'AI排行榜',
      dsc: '每周一自动推送AI模型排行榜，支持手动触发',
      event: 'message',
      priority: 2000,
      rule: [{
        reg: 'AI排行|排行榜|AI模型排行',
        fnc: 'pushArenaRank'
      }]
    });
    this.task = {
      name: 'arenaRank定时推送',
      fnc: () => this.sendArenaRank(),
      cron: CRON_EXPRESSION
    };
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
          '--no-zygote'
        ],
        ignoreHTTPSErrors: true,
        timeout: 60000,
        protocolTimeout: 60000
      });

      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(30000);
      await page.setDefaultTimeout(30000);

      logger.info('[AI排行榜] 正在加载页面...');
      await page.goto(ARENA_URL, {
        waitUntil: ['load', 'networkidle0'],
        timeout: 30000
      });

      logger.info('[AI排行榜] 页面加载完成，正在截图...');
      
      tempFile = `./temp/arena_rank_${Date.now()}.png`;
      await page.screenshot({
        path: tempFile,
        type: 'png',
        fullPage: true,
        omitBackground: false
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
    if (!config.isPush) return;
    const img = await this.getArenaRankImg();
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
