
import axios from 'axios'
import * as cheerio from 'cheerio';
import { segment } from 'oicq';

// API配置
const API_CONFIG = {
  PRIMARY: 'https://b.2xiu.vip',
  BACKUP: 'http://25.xiuren005.top',
  TIMEOUT: 15000
}

// 存储搜索结果
let xiurenResult = [];
let keyword = '';

export class XiuRenPlugin extends plugin {
  constructor() {
    super({
      name: '秀人网', // 插件名称
      dsc: '秀人网图集浏览', // 插件描述
      event: 'message', // 监听事件类型
      priority: 1000, // 优先级
      rule: [
        {
          reg: "^#秀人$", // 匹配规则 - 首页
          fnc: 'getHomePage',
        },
        {
          reg: "^#秀人搜索(.*)$|^#秀人搜索页码(.*)$", // 匹配规则 - 搜索
          fnc: 'searchXiuren',
        },
        {
          reg: "^#看秀图(.*)", // 匹配规则 - 查看详情
          fnc: 'viewXiurenDetail',
        }
      ],
    });
  }

  // 获取首页内容
  async getHomePage(e) {
    await e.reply("正在获取秀人网首页内容，请稍候...");
    
    try {
      // 尝试使用主API获取首页内容
      const html = await this.fetchWithRetry(`${API_CONFIG.PRIMARY}/`);
      return this.parseAndSendGalleryList(e, html, "首页图集");
    } catch (err) {
      logger.error(`秀人网首页请求失败: ${err.message}`);
      await e.reply(`获取首页内容失败，请稍后重试。错误信息: ${err.message}`);
      return false;
    }
  }

  // 搜索功能
  async searchXiuren(e) {
    let message = e.msg;
    let pageNum = 1;
    
    // 处理页码搜索
    if (message.includes("#秀人搜索页码")) {
      pageNum = message.replace(/#秀人搜索页码/g, "").trim();
      if (!keyword) {
        e.reply("请先使用 #秀人搜索关键词 进行搜索");
        return false;
      }
    } else {
      // 处理关键词搜索
      keyword = message.replace(/#秀人搜索/g, "").trim();
      if (!keyword) {
        e.reply("请输入搜索关键词~");
        return false;
      }
    }
    
    await e.reply(`正在搜索"${keyword}"，页码: ${pageNum}，请稍候...`);
    
    try {
      // 构建搜索URL
      const searchUrl = `${API_CONFIG.PRIMARY}/page/${pageNum}?s=${encodeURIComponent(keyword)}`;
      const html = await this.fetchWithRetry(searchUrl);
      return this.parseAndSendGalleryList(e, html, `"${keyword}"的搜索结果`);
    } catch (err) {
      logger.error(`秀人网搜索请求失败: ${err.message}`);
      await e.reply(`搜索失败，请稍后重试。错误信息: ${err.message}`);
      return false;
    }
  }

  // 查看详情图片
  async viewXiurenDetail(e) {
    const index = e.msg.replace(/#看秀图/g, "").trim();
    
    if (isNaN(index)) {
      e.reply("请输入正确的数字！");
      return false;
    }
    
    const idx = Number(index) - 1;
    const url = xiurenResult[idx];
    
    if (!url) {
      e.reply("结果不存在！请先进行搜索或浏览首页");
      return false;
    }
    
    await e.reply("正在获取详细图片，请稍候...");
    
    try {
      // 获取详情页内容
      const html = await this.fetchWithRetry(url);
      const $ = cheerio.load(html);
      const msgList = [];
      
      // 提取标题
      const title = $('.entry-title').text().trim();
      if (title) {
        msgList.push({
          message: `【${title}】`,
          nickname: Bot.nickname,
          user_id: Bot.uin
        });
      }
      
      // 提取所有图片
      let imageCount = 0;
      $('.entry-content img, .entry-wrapper img').each((index, element) => {
        let imgSrc = $(element).attr('src') || $(element).attr('data-src');
        
        // 确保图片链接是完整的URL
        if (imgSrc && !imgSrc.startsWith('http')) {
          imgSrc = new URL(imgSrc, url).href;
        }
        
        if (imgSrc) {
          imageCount++;
          let msg = {
            message: segment.image(imgSrc),
            nickname: Bot.nickname,
            user_id: Bot.uin
          };
          msgList.push(msg);
        }
      });
      
      if (msgList.length > 0) {
        await e.reply(`共找到 ${imageCount} 张图片，正在发送...`);
        await e.reply(await Bot.makeForwardMsg(msgList), false);
        return true;
      } else {
        await e.reply("未找到图片，可能是网站结构已变更");
        return false;
      }
    } catch (err) {
      logger.error(`获取详细图片失败: ${err.message}`);
      await e.reply(`获取图片失败，请稍后重试。错误信息: ${err.message}`);
      return false;
    }
  }

  // 解析并发送图集列表
  async parseAndSendGalleryList(e, html, title) {
    const $ = cheerio.load(html);
    const msgInfos = [];
    xiurenResult = []; // 清空之前的结果
    
    // 查找所有文章内容
    $('.article-content, .post').each((i, ele) => {
      let obj = {};
      let href = $(ele).find('a').attr('href');
      obj.title = $(ele).find('img').attr('alt') || $(ele).find('.entry-title').text().trim();
      obj.imgSrc = $(ele).find('img').attr('src') || $(ele).find('img').attr('data-src');
      
      // 确保图片链接是完整的URL
      if (obj.imgSrc && !obj.imgSrc.startsWith('http')) {
        obj.imgSrc = new URL(obj.imgSrc, API_CONFIG.PRIMARY).href;
      }
      
      if (href) {
        xiurenResult.push(href);
        msgInfos.push(obj);
      }
    });

    if (msgInfos.length > 0) {
      const msgList = [];
      
      // 添加标题和使用说明
      msgList.push({
        message: `【${title}】(共${msgInfos.length}条)\n你可以使用 #看秀图1 / #看秀图2 来查看详细图片，或者使用 #秀人搜索页码2 来跳转页码`,
        nickname: Bot.nickname,
        user_id: Bot.uin
      });
      
      // 添加每个图集的预览
      msgInfos.forEach((item, index) => {
        let tmpTitle = item.title || '无标题';
        if (tmpTitle && !tmpTitle.endsWith('】') && !tmpTitle.endsWith(']')) {
          tmpTitle += '】';
        }
        tmpTitle = tmpTitle.replace(/\[/g, '【').replace(/\]/g, '】');
        
        let tmpMsg = `${index + 1}、\n${segment.image(item.imgSrc)}\n${tmpTitle}`;
        
        let msgInfo = {
          message: tmpMsg,
          nickname: Bot.nickname,
          user_id: Bot.uin
        };
        msgList.push(msgInfo);
      });
      
      await e.reply(await Bot.makeForwardMsg(msgList), false);
      return true;
    } else {
      await e.reply('未找到匹配的内容，请尝试其他关键词');
      return false;
    }
  }

  // 带有重试和备用API的请求方法
  async fetchWithRetry(url, retryCount = 0) {
    try {
      // 确定使用哪个API
      const baseUrl = retryCount % 2 === 0 ? API_CONFIG.PRIMARY : API_CONFIG.BACKUP;
      const targetUrl = url.replace(API_CONFIG.PRIMARY, baseUrl).replace(API_CONFIG.BACKUP, baseUrl);
      
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: API_CONFIG.TIMEOUT
      });
      
      return response.data;
    } catch (error) {
      // 如果失败且未超过最大重试次数，则尝试使用备用API
      if (retryCount < 1) {
        logger.warn(`API请求失败，尝试使用备用API: ${error.message}`);
        return this.fetchWithRetry(url, retryCount + 1);
      }
      
      logger.error(`所有API请求均失败: ${error.message}`);
      throw error;
    }
  }
}
