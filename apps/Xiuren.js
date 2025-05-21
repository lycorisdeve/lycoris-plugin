
import axios from 'axios'
import * as cheerio from 'cheerio';
import { segment } from 'oicq';
import https from 'https';

// 网站配置 - 只使用一个指定的秀人网站点
const SITE_CONFIG = {
  SITE: 'http://25.xiuren005.top',
  // 超时设置
  TIMEOUT: 15000,
  // 随机延迟范围（毫秒）
  DELAY_MIN: 500,
  DELAY_MAX: 2000
}

// 存储搜索结果
let xiurenResult = [];
let keyword = '';

// 用户代理列表
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

// 网站选择器配置 - 针对25.xiuren005.top的选择器
const SELECTORS = {
  // 首页和搜索页
  home: {
    items: '.update_area .update_area_content .update_area_lists .update_area_list',
    title: '.update_area_title',
    image: '.update_area_image img',
    link: 'a'
  },
  // 详情页
  detail: {
    title: '.content_left_title',
    images: '.content_left_content img'
  }
};

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
        },
        {
          reg: "^#秀人调试$", // 匹配规则 - 调试
          fnc: 'debugXiuren',
        }
      ],
    });
  }

  // 获取随机延迟
  getRandomDelay() {
    return Math.floor(Math.random() * (SITE_CONFIG.DELAY_MAX - SITE_CONFIG.DELAY_MIN + 1)) + SITE_CONFIG.DELAY_MIN;
  }

  // 获取随机用户代理
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  // 调试功能
  async debugXiuren(e) {
    if (!e.isMaster) {
      e.reply("只有主人才能使用调试功能");
      return false;
    }

    const debugInfo = {
      site: SITE_CONFIG.SITE,
      timeout: SITE_CONFIG.TIMEOUT,
      delay: `${SITE_CONFIG.DELAY_MIN}-${SITE_CONFIG.DELAY_MAX}ms`,
      userAgents: USER_AGENTS.length,
      selectors: SELECTORS
    };

    await e.reply("秀人网插件调试信息：\n" + JSON.stringify(debugInfo, null, 2));
    return true;
  }

  // 获取首页内容
  async getHomePage(e) {
    await e.reply("正在获取秀人网首页内容，请稍候...");

    try {
      // 获取首页内容
      const html = await this.fetchWithRetry(`${SITE_CONFIG.SITE}/`);
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
      const searchUrl = `${SITE_CONFIG.SITE}/search/${encodeURIComponent(keyword)}/${pageNum}.html`;
      logger.info(`尝试从 ${searchUrl} 搜索`);
      
      // 添加随机延迟
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
      
      const html = await this.fetchWithRetry(searchUrl);
      const result = await this.parseAndSendGalleryList(e, html, `"${keyword}"的搜索结果`);
      
      if (result) {
        return true;
      } else {
        await e.reply(`搜索"${keyword}"未找到结果，请尝试其他关键词`);
        return false;
      }
    } catch (err) {
      logger.warn(`搜索失败: ${err.message}`);
      await e.reply(`搜索"${keyword}"失败，请尝试其他关键词或稍后再试`);
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
      // 添加随机延迟
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
      
      // 获取详情页内容
      const html = await this.fetchWithRetry(url);
      const $ = cheerio.load(html);
      const msgList = [];

      // 提取标题
      const title = $(SELECTORS.detail.title).text().trim();
      
      if (title) {
        msgList.push({
          message: `【${title}】`,
          nickname: Bot.nickname,
          user_id: Bot.uin
        });
      }

      // 提取所有图片
      let imageCount = 0;
      $(SELECTORS.detail.images).each((index, element) => {
        let imgSrc = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-original');
        
        // 过滤广告图片和小图标
        if (imgSrc && !imgSrc.includes('ad') && !imgSrc.includes('logo') && !imgSrc.includes('icon')) {
          // 确保图片链接是完整的URL
          if (imgSrc && !imgSrc.startsWith('http')) {
            imgSrc = new URL(imgSrc, SITE_CONFIG.SITE).href;
          }
          
          if (imgSrc) {
            imageCount++;
            msgList.push({
              message: segment.image(imgSrc),
              nickname: Bot.nickname,
              user_id: Bot.uin
            });
          }
        }
      });

      if (msgList.length > 1) { // 至少有标题和一张图片
        await e.reply(`共找到 ${imageCount} 张图片，正在发送...`);
        await e.reply(await Bot.makeForwardMsg(msgList), false);
        return true;
      } else {
        // 如果常规方法失败，尝试查找所有img标签
        $('img').each((index, element) => {
          let imgSrc = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-original');
          
          // 过滤广告图片和小图标
          if (imgSrc && !imgSrc.includes('ad') && !imgSrc.includes('logo') && !imgSrc.includes('icon')) {
            // 确保图片链接是完整的URL
            if (imgSrc && !imgSrc.startsWith('http')) {
              imgSrc = new URL(imgSrc, SITE_CONFIG.SITE).href;
            }
            
            if (imgSrc) {
              imageCount++;
              msgList.push({
                message: segment.image(imgSrc),
                nickname: Bot.nickname,
                user_id: Bot.uin
              });
            }
          }
        });
        
        if (msgList.length > 1) {
          await e.reply(`共找到 ${imageCount} 张图片，正在发送...`);
          await e.reply(await Bot.makeForwardMsg(msgList), false);
          return true;
        } else {
          await e.reply("未找到图片，可能是网站结构已变更，请尝试手动访问网站查看HTML结构");
          return false;
        }
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
    
    // 查找所有图集项
    $(SELECTORS.home.items).each((i, ele) => {
      let obj = {};
      let href = $(ele).find(SELECTORS.home.link).attr('href');
      obj.title = $(ele).find(SELECTORS.home.title).text().trim();
      obj.imgSrc = $(ele).find(SELECTORS.home.image).attr('src') || 
                  $(ele).find(SELECTORS.home.image).attr('data-src') || 
                  $(ele).find(SELECTORS.home.image).attr('data-original');
      
      // 确保图片链接是完整的URL
      if (obj.imgSrc && !obj.imgSrc.startsWith('http')) {
        obj.imgSrc = new URL(obj.imgSrc, SITE_CONFIG.SITE).href;
      }
      
      // 确保链接是完整的URL
      if (href && !href.startsWith('http')) {
        href = new URL(href, SITE_CONFIG.SITE).href;
      }
      
      if (href && obj.imgSrc && obj.title) {
        xiurenResult.push(href);
        msgInfos.push(obj);
      }
    });
    
    // 如果常规方法失败，尝试查找所有带链接的图片
    if (msgInfos.length === 0) {
      $('a').each((i, ele) => {
        let href = $(ele).attr('href');
        if (href && href.includes('/')) {
          let imgElement = $(ele).find('img');
          if (imgElement.length > 0) {
            let obj = {};
            obj.title = $(ele).text().trim() || imgElement.attr('alt') || '无标题';
            obj.imgSrc = imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-original');
            
            // 确保图片链接是完整的URL
            if (obj.imgSrc && !obj.imgSrc.startsWith('http')) {
              obj.imgSrc = new URL(obj.imgSrc, SITE_CONFIG.SITE).href;
            }
            
            // 确保链接是完整的URL
            if (href && !href.startsWith('http')) {
              href = new URL(href, SITE_CONFIG.SITE).href;
            }
            
            if (obj.imgSrc) {
              xiurenResult.push(href);
              msgInfos.push(obj);
            }
          }
        }
      });
    }

    if (msgInfos.length > 0) {
      const msgList = [];

      // 添加标题和使用说明
      msgList.push({
        message: `【${title}】(共${msgInfos.length}条)\n你可以使用 #看秀图1 / #看秀图2 来查看详细图片，或者使用 #秀人搜索页码2 来跳转页码`,
        nickname: Bot.nickname,
        user_id: Bot.uin
      });

      // 添加每个图集的预览
      let validCount = 0;
      for (let index = 0; index < msgInfos.length; index++) {
        const item = msgInfos[index];
        let tmpTitle = item.title || '无标题';
        if (tmpTitle && !tmpTitle.endsWith('】') && !tmpTitle.endsWith(']')) {
          tmpTitle += '】';
        }
        tmpTitle = tmpTitle.replace(/\[/g, '【').replace(/\]/g, '】');

        // 检查图片URL是否有效
        if (!item.imgSrc || item.imgSrc.includes('/logo.png') || item.imgSrc.includes('/template/')) {
          continue;
        }

        validCount++;
        try {
          msgList.push({
            message: `${validCount}、\n${segment.image(item.imgSrc)}\n${tmpTitle}`,
            nickname: Bot.nickname,
            user_id: Bot.uin
          });
        } catch (error) {
          logger.error(`构建消息失败: ${error.message}`);
          msgList.push({
            message: `${validCount}、\n${tmpTitle}\n(图片加载失败)`,
            nickname: Bot.nickname,
            user_id: Bot.uin
          });
        }
      }

      if (msgList.length <= 1) {
        await e.reply("未找到有效的图集，请尝试其他关键词");
        return false;
      }

      // 更新xiurenResult数组，确保索引与显示的编号一致
      const newXiurenResult = [];
      for (let i = 0; i < msgInfos.length; i++) {
        if (!msgInfos[i].imgSrc || msgInfos[i].imgSrc.includes('/logo.png') || msgInfos[i].imgSrc.includes('/template/')) {
          continue;
        }
        newXiurenResult.push(xiurenResult[i]);
      }
      xiurenResult = newXiurenResult;

      await e.reply(await Bot.makeForwardMsg(msgList), false);
      return true;
    } else {
      logger.warn(`未找到匹配的内容`);
      return false;
    }
  }

  // 带有重试的请求方法
  async fetchWithRetry(url, retryCount = 0) {
    try {
      // 创建自定义的HTTPS代理，禁用证书验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false // 禁用证书验证
      });

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': SITE_CONFIG.SITE,
          'Cache-Control': 'no-cache'
        },
        timeout: SITE_CONFIG.TIMEOUT,
        httpsAgent: url.startsWith('https') ? httpsAgent : undefined // 仅对HTTPS请求禁用证书验证
      });

      return response.data;
    } catch (error) {
      // 如果失败且未超过最大重试次数，则重试
      if (retryCount < 2) {
        logger.warn(`请求失败，正在重试(${retryCount + 1}/3): ${error.message}`);
        // 添加随机延迟
        await new Promise(resolve => setTimeout(resolve, this.getRandomDelay() * 2));
        return this.fetchWithRetry(url, retryCount + 1);
      }

      logger.error(`请求失败: ${error.message}`);
      throw error;
    }
  }
}
