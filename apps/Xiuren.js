
import axios from 'axios'
import * as cheerio from 'cheerio';
import { segment } from 'oicq';
import https from 'https';

// 网站配置 - 更新为更多可能的秀人网站点
const SITE_CONFIG = {
  SITES: [
    'https://x5.xr5.top',
    'http://25.xiuren005.top',
    'https://www.xiuren.org',
    'https://www.xiurenset.com',
    'https://www.xiuren.vip',
    'https://www.xiuren.cc',
    'https://www.xiuren.net',
    'https://www.xiuren.one',
    'https://www.xiurenb.net'
  ],
  // 反代API，如果有的话
  PROXY_API: 'https://proxyapi.198143.xyz/',
  // 是否使用反代
  USE_PROXY: false,
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

// 网站选择器配置 - 针对不同网站的不同选择器
const SELECTORS = {
  // 通用选择器
  common: {
    title: ['.entry-title', 'h1.title', '.post-title', 'h1', '.article-title'],
    content: [
      '.article-content', 
      '.post', 
      '.post-item', 
      '.content-item', 
      '.item', 
      '.article', 
      '.post-list .post',
      '.posts-list .item'
    ],
    image: [
      '.entry-content img', 
      '.entry-wrapper img', 
      '.article-content img', 
      '.post-content img', 
      '.content img',
      '.main-content img',
      '.single-content img',
      '.detail-content img'
    ]
  },
  // 特定网站的选择器
  specific: {
    'x5.xr5.top': {
      content: ['.article-content'],
      image: ['.entry-content img']
    },
    'xiuren.org': {
      content: ['.post'],
      image: ['.single-content img']
    }
    // 可以根据实际情况添加更多网站的特定选择器
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
      sites: SITE_CONFIG.SITES,
      useProxy: SITE_CONFIG.USE_PROXY,
      proxyApi: SITE_CONFIG.PROXY_API,
      timeout: SITE_CONFIG.TIMEOUT,
      delay: `${SITE_CONFIG.DELAY_MIN}-${SITE_CONFIG.DELAY_MAX}ms`,
      userAgents: USER_AGENTS.length,
      selectors: {
        common: SELECTORS.common,
        specific: Object.keys(SELECTORS.specific)
      }
    };

    await e.reply("秀人网插件调试信息：\n" + JSON.stringify(debugInfo, null, 2));
    return true;
  }

  // 获取首页内容
  async getHomePage(e) {
    await e.reply("正在获取秀人网首页内容，请稍候...");

    try {
      // 尝试使用第一个站点获取首页内容
      const html = await this.fetchWithRetry(`${SITE_CONFIG.SITES[0]}/`);
      return this.parseAndSendGalleryList(e, html, "首页图集", SITE_CONFIG.SITES[0]);
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

    // 尝试所有站点进行搜索
    for (const site of SITE_CONFIG.SITES) {
      try {
        // 构建搜索URL
        const searchUrl = `${site}/page/${pageNum}?s=${encodeURIComponent(keyword)}`;
        logger.info(`尝试从 ${searchUrl} 搜索`);
        
        // 添加随机延迟
        await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
        
        const html = await this.fetchWithRetry(searchUrl);
        const result = await this.parseAndSendGalleryList(e, html, `"${keyword}"的搜索结果`, site);
        
        if (result) {
          return true; // 如果成功找到结果，就不再尝试其他站点
        }
      } catch (err) {
        logger.warn(`从 ${site} 搜索失败: ${err.message}`);
        // 继续尝试下一个站点
      }
    }
    
    // 所有站点都尝试失败
    await e.reply(`搜索"${keyword}"失败，请尝试其他关键词或稍后再试`);
    return false;
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

      // 提取标题 - 尝试多种可能的选择器
      let title = '';
      
      // 获取当前网站的域名
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 尝试使用特定网站的选择器
      const titleSelectors = SELECTORS.specific[domain]?.title || SELECTORS.common.title;
      
      for (const selector of titleSelectors) {
        const foundTitle = $(selector).first().text().trim();
        if (foundTitle) {
          title = foundTitle;
          break;
        }
      }
      
      if (title) {
        msgList.push({
          message: `【${title}】`,
          nickname: Bot.nickname,
          user_id: Bot.uin
        });
      }

      // 提取所有图片 - 尝试多种可能的选择器
      let imageCount = 0;
      let foundImages = false;
      
      // 尝试使用特定网站的选择器
      const imageSelectors = SELECTORS.specific[domain]?.image || SELECTORS.common.image;
      
      for (const selector of imageSelectors) {
        const images = $(selector);
        if (images.length > 0) {
          images.each((index, element) => {
            let imgSrc = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-original');
            
            // 过滤广告图片和小图标
            if (imgSrc && !imgSrc.includes('ad') && !imgSrc.includes('logo') && !imgSrc.includes('icon')) {
              // 确保图片链接是完整的URL
              if (imgSrc && !imgSrc.startsWith('http')) {
                imgSrc = new URL(imgSrc, url).href;
              }
              
              if (imgSrc) {
                imageCount++;
                // 修复这里，直接使用字符串形式
                let msg = {
                  message: segment.image(imgSrc),
                  nickname: Bot.nickname,
                  user_id: Bot.uin
                };
                msgList.push(msg);
                foundImages = true;
              }
            }
          });
          
          if (foundImages) break;
        }
      }

      if (msgList.length > 0) {
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
              imgSrc = new URL(imgSrc, url).href;
            }
            
            if (imgSrc) {
              imageCount++;
              // 修复这里，直接使用字符串形式
              let msg = {
                message: segment.image(imgSrc),
                nickname: Bot.nickname,
                user_id: Bot.uin
              };
              msgList.push(msg);
            }
          }
        });
        
        if (msgList.length > 0) {
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
  async parseAndSendGalleryList(e, html, title, siteUrl) {
    const $ = cheerio.load(html);
    const msgInfos = [];
    xiurenResult = []; // 清空之前的结果

    // 获取当前网站的域名
    const urlObj = new URL(siteUrl);
    const domain = urlObj.hostname;
    
    // 尝试使用特定网站的选择器
    const contentSelectors = SELECTORS.specific[domain]?.content || SELECTORS.common.content;
    
    let foundContent = false;
    
    for (const selector of contentSelectors) {
      $(selector).each((i, ele) => {
        let obj = {};
        let href = $(ele).find('a').attr('href');
        obj.title = $(ele).find('img').attr('alt') || $(ele).find('.entry-title').text().trim() || $(ele).find('h2').text().trim();
        obj.imgSrc = $(ele).find('img').attr('src') || $(ele).find('img').attr('data-src') || $(ele).find('img').attr('data-original');
        
        // 确保图片链接是完整的URL
        if (obj.imgSrc && !obj.imgSrc.startsWith('http')) {
          obj.imgSrc = new URL(obj.imgSrc, siteUrl).href;
        }
        
        // 确保链接是完整的URL
        if (href && !href.startsWith('http')) {
          href = new URL(href, siteUrl).href;
        }
        
        if (href && obj.imgSrc) {
          xiurenResult.push(href);
          msgInfos.push(obj);
          foundContent = true;
        }
      });
      
      if (foundContent) break;
    }
    
    // 如果常规方法失败，尝试查找所有带链接的图片
    if (msgInfos.length === 0) {
      $('a').each((i, ele) => {
        let href = $(ele).attr('href');
        if (href && href.includes('/')) {
          let imgElement = $(ele).find('img');
          if (imgElement.length > 0) {
            let obj = {};
            obj.title = imgElement.attr('alt') || $(ele).text().trim();
            obj.imgSrc = imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-original');
            
            // 确保图片链接是完整的URL
            if (obj.imgSrc && !obj.imgSrc.startsWith('http')) {
              obj.imgSrc = new URL(obj.imgSrc, siteUrl).href;
            }
            
            // 确保链接是完整的URL
            if (href && !href.startsWith('http')) {
              href = new URL(href, siteUrl).href;
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

      // 添加每个图集的预览 - 修复消息构建方式
      for (let index = 0; index < msgInfos.length; index++) {
        const item = msgInfos[index];
        let tmpTitle = item.title || '无标题';
        if (tmpTitle && !tmpTitle.endsWith('】') && !tmpTitle.endsWith(']')) {
          tmpTitle += '】';
        }
        tmpTitle = tmpTitle.replace(/\[/g, '【').replace(/\]/g, '】');

        // 检查图片URL是否有效（避免使用logo.png和404图片）
        if (item.imgSrc.includes('/logo.png') || item.imgSrc.includes('/template/')) {
          // 跳过使用logo作为预览图的项目
          continue;
        }

        try {
          // 创建单独的消息对象，不使用数组
          let msgInfo = {
            message: `${index + 1}、\n${segment.image(item.imgSrc)}\n${tmpTitle}`,
            nickname: Bot.nickname,
            user_id: Bot.uin
          };
          msgList.push(msgInfo);
        } catch (error) {
          logger.error(`构建消息失败: ${error.message}`);
          // 使用备用方式构建消息
          let msgInfo = {
            message: `${index + 1}、\n${tmpTitle}\n(图片加载失败)`,
            nickname: Bot.nickname,
            user_id: Bot.uin
          };
          msgList.push(msgInfo);
        }
      }

      if (msgList.length <= 1) {
        await e.reply("未找到有效的图集，请尝试其他关键词");
        return false;
      }

      await e.reply(await Bot.makeForwardMsg(msgList), false);
      return true;
    } else {
      logger.warn(`从 ${siteUrl} 未找到匹配的内容`);
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

      // 提取标题 - 尝试多种可能的选择器
      let title = '';
      
      // 获取当前网站的域名
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 尝试使用特定网站的选择器
      const titleSelectors = SELECTORS.specific[domain]?.title || SELECTORS.common.title;
      
      for (const selector of titleSelectors) {
        const foundTitle = $(selector).first().text().trim();
        if (foundTitle) {
          title = foundTitle;
          break;
        }
      }
      
      if (title) {
        msgList.push({
          message: `【${title}】`,
          nickname: Bot.nickname,
          user_id: Bot.uin
        });
      }

      // 提取所有图片 - 尝试多种可能的选择器
      let imageCount = 0;
      let foundImages = false;
      
      // 尝试使用特定网站的选择器
      const imageSelectors = SELECTORS.specific[domain]?.image || SELECTORS.common.image;
      
      for (const selector of imageSelectors) {
        const images = $(selector);
        if (images.length > 0) {
          images.each((index, element) => {
            let imgSrc = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-original');
            
            // 过滤广告图片和小图标
            if (imgSrc && !imgSrc.includes('ad') && !imgSrc.includes('logo') && !imgSrc.includes('icon')) {
              // 确保图片链接是完整的URL
              if (imgSrc && !imgSrc.startsWith('http')) {
                imgSrc = new URL(imgSrc, url).href;
              }
              
              if (imgSrc) {
                imageCount++;
                // 修复这里，直接使用字符串形式
                let msg = {
                  message: segment.image(imgSrc),
                  nickname: Bot.nickname,
                  user_id: Bot.uin
                };
                msgList.push(msg);
                foundImages = true;
              }
            }
          });
          
          if (foundImages) break;
        }
      }

      if (msgList.length > 0) {
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
              imgSrc = new URL(imgSrc, url).href;
            }
            
            if (imgSrc) {
              imageCount++;
              // 修复这里，直接使用字符串形式
              let msg = {
                message: segment.image(imgSrc),
                nickname: Bot.nickname,
                user_id: Bot.uin
              };
              msgList.push(msg);
            }
          }
        });
        
        if (msgList.length > 0) {
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

  // 带有重试的请求方法
  async fetchWithRetry(url, retryCount = 0) {
    try {
      // 如果启用了反代API
      if (SITE_CONFIG.USE_PROXY) {
        return await this.fetchWithProxy(url);
      }
      
      // 创建自定义的HTTPS代理，禁用证书验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false // 禁用证书验证
      });

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': new URL(url).origin,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
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

  // 使用反代API获取内容
  async fetchWithProxy(url) {
    try {
      // 对目标URL进行编码
      const encodedUrl = encodeURIComponent(url);
      const proxyUrl = `${SITE_CONFIG.PROXY_API}${encodedUrl}`;
      
      const response = await axios.get(proxyUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: SITE_CONFIG.TIMEOUT
      });
      
      return response.data;
    } catch (error) {
      logger.error(`反代请求失败: ${error.message}`);
      throw error;
    }
  }
}
