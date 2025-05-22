
import axios from 'axios'
import * as cheerio from 'cheerio';
import { segment } from 'icqq';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { pluginResources } from "../components/lib/Path.js";
import { createCanvas, loadImage } from 'canvas';

// 网站配置 - 秀人网站点
const SITE_CONFIG = {
  SITE: 'https://www.xiurenb.net', // 更新为新的网站地址
  // 超时设置
  TIMEOUT: 15000,
  // 随机延迟范围（毫秒）
  DELAY_MIN: 500,
  DELAY_MAX: 2000
}

// 存储搜索结果
let xiurenResult = [];
let keyword = '';

// 临时图片目录
const TEMP_DIR = `${pluginResources}/xiuren/temp`;

// 用户代理列表
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

// 网站选择器配置 - 基于新网站的HTML结构
const SELECTORS = {
  // 首页和搜索页
  home: {
    items: '.post-list .item',
    title: '.item-title',
    image: '.item-img img',
    link: '.item-img a',
    date: '.item-meta',
    views: '.item-meta .views'
  },
  // 详情页
  detail: {
    title: '.article-title',
    images: '.article-content img',
    pagination: '.pagination a'
  }
};

export class XiuRen extends plugin {
  constructor() {
    super({
      name: '秀人网',
      dsc: '秀人网图集浏览',
      event: 'message',
      priority: 1000,
      rule: [
        {
          reg: "^#秀人$",
          fnc: 'getHomePage',
        },
        {
          reg: "^#秀人热门$",
          fnc: 'getHotPage',
        },
        {
          reg: "^#秀人搜索(.*)$|^#秀人搜索页码(.*)$",
          fnc: 'searchXiuren',
        },
        {
          reg: "^#看秀图(.*)",
          fnc: 'viewXiurenDetail',
        }
      ],
    });

    // 初始化时确保临时目录存在
    this.ensureTempDirExists();
  }

  // 确保临时目录存在
  ensureTempDirExists() {
    try {
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
        logger.info(`创建临时目录: ${TEMP_DIR}`);
      }
    } catch (error) {
      logger.error(`创建临时目录失败: ${error.message}`);
    }
  }

  // 清理临时目录中的所有文件
  cleanTempDir() {
    try {
      if (fs.existsSync(TEMP_DIR)) {
        const files = fs.readdirSync(TEMP_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(TEMP_DIR, file));
        }
        logger.info(`清理临时目录: ${TEMP_DIR}`);
      }
    } catch (error) {
      logger.error(`清理临时目录失败: ${error.message}`);
    }
  }

  // 下载图片到本地并转换格式
  async downloadImage(url) {
    // 确保URL格式正确
    url = url.trim();
    if (!url) return null;

    try {
      // 生成唯一的文件名
      const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const filePath = path.join(TEMP_DIR, fileName);

      logger.info(`开始下载图片: ${url}`);

      // 创建自定义的HTTPS代理，禁用证书验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false // 禁用证书验证
      });

      // 下载图片
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Referer': SITE_CONFIG.SITE,
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        },
        timeout: SITE_CONFIG.TIMEOUT,
        httpsAgent: url.startsWith('https') ? httpsAgent : undefined
      });

      // 检查是否为webp格式
      const contentType = response.headers['content-type'] || '';
      const isWebp = contentType.includes('webp') || url.toLowerCase().includes('.webp');

      if (isWebp) {
        // 使用canvas将webp转换为jpg
        try {
          // 创建一个临时的webp文件
          const tempWebpPath = path.join(TEMP_DIR, `temp_${Date.now()}.webp`);
          fs.writeFileSync(tempWebpPath, Buffer.from(response.data));
          
          // 使用canvas加载webp并转换为jpg
          const img = await loadImage(tempWebpPath);
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          // 将canvas保存为jpg
          const jpgBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
          fs.writeFileSync(filePath, jpgBuffer);
          
          // 删除临时webp文件
          fs.unlinkSync(tempWebpPath);
          
          logger.info(`webp图片已转换为jpg格式: ${filePath}`);
        } catch (conversionError) {
          // 如果转换失败，尝试直接保存为jpg
          logger.warn(`webp转换失败，尝试直接保存: ${conversionError.message}`);
          fs.writeFileSync(filePath, Buffer.from(response.data));
        }
      } else {
        // 非webp格式，直接写入文件
        fs.writeFileSync(filePath, Buffer.from(response.data));
        logger.info(`图片下载成功: ${filePath}`);
      }

      return filePath;
    } catch (error) {
      logger.error(`图片下载失败: ${error.message}, URL: ${url}`);
      return null;
    }
  }

  // 删除临时文件
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`删除临时文件: ${filePath}`);
      }
    } catch (error) {
      logger.error(`删除临时文件失败: ${error.message}, 文件: ${filePath}`);
    }
  }

  // 获取随机延迟
  getRandomDelay() {
    return Math.floor(Math.random() * (SITE_CONFIG.DELAY_MAX - SITE_CONFIG.DELAY_MIN + 1)) + SITE_CONFIG.DELAY_MIN;
  }

  // 获取随机用户代理
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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

  // 获取热门内容
  async getHotPage(e) {
    await e.reply("正在获取秀人网热门内容，请稍候...");

    try {
      // 获取热门页内容
      const html = await this.fetchWithRetry(`${SITE_CONFIG.SITE}/hot`);
      return this.parseAndSendGalleryList(e, html, "热门图集");
    } catch (err) {
      logger.error(`秀人网热门页请求失败: ${err.message}`);
      await e.reply(`获取热门内容失败，请稍后重试。错误信息: ${err.message}`);
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
      const searchUrl = `${SITE_CONFIG.SITE}/search/${encodeURIComponent(keyword)}/page/${pageNum}`;
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

  // 查看详情
  async viewXiurenDetail(e) {
    const index = parseInt(e.msg.replace(/#看秀图/g, "").trim()) - 1;

    if (isNaN(index) || index < 0 || !xiurenResult || index >= xiurenResult.length) {
      e.reply("请输入正确的图集序号");
      return false;
    }

    const url = xiurenResult[index];
    if (!url) {
      e.reply("未找到对应的图集链接");
      return false;
    }

    await e.reply(`正在获取图集详情，请稍候...`);

    // 清理之前的临时文件
    this.cleanTempDir();

    try {
      // 添加随机延迟
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));

      const html = await this.fetchWithRetry(url);
      const $ = cheerio.load(html);

      // 获取标题
      const title = $(SELECTORS.detail.title).text().trim() || $('title').text().trim();

      // 获取所有图片
      const images = [];
      $(SELECTORS.detail.images).each((i, ele) => {
        const imgSrc = $(ele).attr('src') || $(ele).attr('data-src') || $(ele).attr('data-original');
        if (imgSrc && !imgSrc.includes('logo.png') && !imgSrc.includes('/template/')) {
          // 确保图片链接是完整的URL
          const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, SITE_CONFIG.SITE).href;
          images.push(fullImgSrc);
        }
      });

      // 如果没有找到图片，尝试其他选择器
      if (images.length === 0) {
        $('img').each((i, ele) => {
          const imgSrc = $(ele).attr('src') || $(ele).attr('data-src') || $(ele).attr('data-original');
          if (imgSrc && !imgSrc.includes('logo.png') && !imgSrc.includes('/template/') &&
            !imgSrc.includes('favicon.ico') && imgSrc.includes('.')) {
            // 确保图片链接是完整的URL
            const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, SITE_CONFIG.SITE).href;
            images.push(fullImgSrc);
          }
        });
      }

      if (images.length === 0) {
        await e.reply("未找到图集中的图片，可能是网站结构已变化");
        return false;
      }

      // 限制图片数量，避免消息过大
      const maxImages = Math.min(images.length, 20);
      const msgList = [];

      // 添加标题消息
      msgList.push({
        message: `【${title}】\n共${images.length}张图片，显示前${maxImages}张`,
        nickname: Bot.nickname,
        user_id: Bot.uin
      });

      // 添加图片消息
      const downloadedFiles = [];
      for (let i = 0; i < maxImages; i++) {
        try {
          // 下载图片到本地
          const localPath = await this.downloadImage(images[i]);
          if (localPath) {
            downloadedFiles.push(localPath);
            msgList.push({
              message: segment.image(localPath),
              nickname: Bot.nickname,
              user_id: Bot.uin
            });
          } else {
            msgList.push({
              message: `[图片${i + 1}下载失败]`,
              nickname: Bot.nickname,
              user_id: Bot.uin
            });
          }

          // 添加随机延迟，避免请求过快
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          logger.error(`图片处理失败: ${error.message}`);
        }
      }

      // 添加原始链接
      msgList.push({
        message: `原始链接: ${url}`,
        nickname: Bot.nickname,
        user_id: Bot.uin
      });

      // 发送消息
      await e.reply(await Bot.makeForwardMsg(msgList));

      // 删除所有临时文件
      for (const file of downloadedFiles) {
        this.deleteFile(file);
      }

      return true;
    } catch (err) {
      logger.error(`获取图集详情失败: ${err.message}`);
      await e.reply(`获取图集详情失败，请稍后重试。错误信息: ${err.message}`);
      // 清理临时文件
      this.cleanTempDir();
      return false;
    } finally {
      // 清理临时文件
      this.cleanTempDir();
    }
  }

  // 解析并发送图集列表
  async parseAndSendGalleryList(e, html, title) {
    const $ = cheerio.load(html);
    const msgInfos = [];
    xiurenResult = []; // 清空之前的结果

    // 清理之前的临时文件
    this.cleanTempDir();

    // 查找所有图集项
    $(SELECTORS.home.items).each((i, ele) => {
      let obj = {};
      let href = $(ele).find(SELECTORS.home.link).attr('href');
      obj.title = $(ele).find(SELECTORS.home.title).text().trim();
      obj.imgSrc = $(ele).find(SELECTORS.home.image).attr('src') ||
        $(ele).find(SELECTORS.home.image).attr('data-src') ||
        $(ele).find(SELECTORS.home.image).attr('data-original');

      // 获取日期和浏览量
      const metaText = $(ele).find(SELECTORS.home.date).text().trim();
      const viewsText = $(ele).find(SELECTORS.home.views).text().trim();
      obj.date = metaText;
      obj.views = viewsText;

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
        if (href && href.includes('/') && !href.includes('javascript:')) {
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
      const downloadedFiles = [];

      // 添加标题和使用说明
      msgList.push({
        message: `【${title}】(共${msgInfos.length}条)\n你可以使用 #看秀图1 / #看秀图2 来查看详细图片`,
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
          // 下载图片到本地
          const localPath = await this.downloadImage(item.imgSrc);
          if (localPath) {
            downloadedFiles.push(localPath);

            // 构建消息
            const message = [
              `${validCount}、${tmpTitle}\n`,
              segment.image(localPath)
            ];

            // 添加日期和浏览量信息（如果有）
            if (item.date || item.views) {
              message.push(`\n${item.date || ''} ${item.views || ''}`);
            }

            msgList.push({
              message,
              nickname: Bot.nickname,
              user_id: Bot.uin
            });
          } else {
            msgList.push({
              message: `${validCount}、${tmpTitle}\n(图片加载失败)`,
              nickname: Bot.nickname,
              user_id: Bot.uin
            });
          }
        } catch (error) {
          logger.error(`构建消息失败: ${error.message}`);
          msgList.push({
            message: `${validCount}、${tmpTitle}\n(图片加载失败)`,
            nickname: Bot.nickname,
            user_id: Bot.uin
          });
        }
      }

      if (msgList.length <= 1) {
        await e.reply("未找到有效的图集，请尝试其他关键词");
        // 清理临时文件
        for (const file of downloadedFiles) {
          this.deleteFile(file);
        }
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

      // 发送消息
      await e.reply(await Bot.makeForwardMsg(msgList));

      // 删除所有临时文件
      for (const file of downloadedFiles) {
        this.deleteFile(file);
      }

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
