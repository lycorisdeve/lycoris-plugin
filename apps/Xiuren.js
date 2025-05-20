
import axios from 'axios'
import * as cheerio from 'cheerio';
import { segment } from 'oicq';
import https from 'https';

// API配置 - 更新为更多可能的网站
const API_CONFIG = {
  PRIMARY: 'https://x5.xr5.top',
  BACKUP1: 'http://25.xiuren005.top',
  BACKUP2: 'https://www.xiuren.org',
  BACKUP3: 'https://www.xiurenset.com',
  BACKUP4: 'https://www.xiuren.vip',
  BACKUP5: 'https://www.xiuren.cc',
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

      // 提取标题 - 尝试多种可能的选择器
      const titleSelectors = ['.entry-title', 'h1.title', '.post-title', 'h1', '.article-title'];
      let title = '';
      
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
      const imageSelectors = [
        '.entry-content img', 
        '.entry-wrapper img', 
        '.article-content img', 
        '.post-content img', 
        '.content img',
        '.main-content img',
        '.single-content img',
        '.detail-content img'
      ];
      
      let foundImages = false;
      
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
  async parseAndSendGalleryList(e, html, title) {
    const $ = cheerio.load(html);
    const msgInfos = [];
    xiurenResult = []; // 清空之前的结果

    // 尝试多种可能的选择器
    const contentSelectors = [
      '.article-content', 
      '.post', 
      '.post-item', 
      '.content-item', 
      '.item', 
      '.article', 
      '.post-list .post',
      '.posts-list .item'
    ];
    
    let foundContent = false;
    
    for (const selector of contentSelectors) {
      $(selector).each((i, ele) => {
        let obj = {};
        let href = $(ele).find('a').attr('href');
        obj.title = $(ele).find('img').attr('alt') || $(ele).find('.entry-title').text().trim() || $(ele).find('h2').text().trim();
        obj.imgSrc = $(ele).find('img').attr('src') || $(ele).find('img').attr('data-src') || $(ele).find('img').attr('data-original');
        
        // 确保图片链接是完整的URL
        if (obj.imgSrc && !obj.imgSrc.startsWith('http')) {
          obj.imgSrc = new URL(obj.imgSrc, API_CONFIG.PRIMARY).href;
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
              obj.imgSrc = new URL(obj.imgSrc, API_CONFIG.PRIMARY).href;
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
      await e.reply('未找到匹配的内容，请尝试其他关键词或手动访问网站查看HTML结构');
      return false;
    }
  }

  // 带有重试和备用API的请求方法
  async fetchWithRetry(url, retryCount = 0) {
    try {
      // 确定使用哪个API
      let baseUrl;
      const apiKeys = Object.keys(API_CONFIG).filter(key => key.includes('PRIMARY') || key.includes('BACKUP'));
      
      if (retryCount < apiKeys.length) {
        baseUrl = API_CONFIG[apiKeys[retryCount]];
      } else {
        baseUrl = API_CONFIG.PRIMARY;
      }

      // 替换URL中的域名部分
      let targetUrl = url;
      
      // 替换所有可能的域名
      for (const key of apiKeys) {
        targetUrl = targetUrl.replace(API_CONFIG[key], baseUrl);
      }

      // 创建自定义的HTTPS代理，禁用证书验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false // 禁用证书验证
      });

      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': baseUrl,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: API_CONFIG.TIMEOUT,
        httpsAgent: targetUrl.startsWith('https') ? httpsAgent : undefined // 仅对HTTPS请求禁用证书验证
      });

      return response.data;
    } catch (error) {
      // 如果失败且未超过最大重试次数，则尝试使用备用API
      const maxRetries = Object.keys(API_CONFIG).filter(key => key.includes('PRIMARY') || key.includes('BACKUP')).length;
      
      if (retryCount < maxRetries - 1) {
        logger.warn(`API请求失败，尝试使用备用API ${retryCount + 1}: ${error.message}`);
        return this.fetchWithRetry(url, retryCount + 1);
      }

      logger.error(`所有API请求均失败: ${error.message}`);
      throw error;
    }
  }
}
