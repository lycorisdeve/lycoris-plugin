
import Parser from 'rss-parser';

import Config from '../../components/Config.js';
import Data from '../../components/Data.js';
import moment from 'moment';
import _ from 'lodash';
import { RssHistory } from '../sqlite3/RssDb.js';
import Render from '../../components/lib/Render.js';
import * as cheerio from 'cheerio';

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

/**
 * RSS 订阅服务类
 * 负责 RSS 订阅的获取、解析、推送等功能
 */
class RssService {
    constructor() {
    }

    /**
     * 获取 RSS 配置信息
     * @returns {Object} RSS 配置对象
     */
    get config() {
        return Config.getConfig('config').rss || {};
    }

    /**
     * 获取所有订阅源列表
     * @returns {Promise<Array>} 订阅源列表，包含 rsshubUrls
     */
    async getFeeds() {
        const list = this.config.subscribe_list || [];
        const rsshubUrls = this.config.rsshub_url || ['https://rsshub.app'];

        return list.map(item => {
            return { ...item, rsshubUrls };
        });
    }

    /**
     * 获取单个订阅源的内容
     * 支持 RSSHub 多实例自动切换
     * @param {Object} item - 订阅源配置项
     * @returns {Promise<Object|null>} 解析后的 feed 对象，失败返回 null
     */
    async fetchFeed(item) {
        let url = item.url;
        const rsshubUrls = item.rsshubUrls || ['https://rsshub.app'];

        // 如果是 RSSHub URL，尝试使用多个实例
        if (url.includes('${rsshub_url}')) {
            for (const baseUrl of rsshubUrls) {
                const targetUrl = url.replace('${rsshub_url}', baseUrl);
                try {
                    const feed = await parser.parseURL(targetUrl);
                    if (feed) return feed;
                } catch (error) {
                    logger.warn(`[RSS] RSSHub 实例失败：${baseUrl} - ${error.message}`);
                    continue;
                }
            }
            logger.error(`[RSS] 所有 RSSHub 实例均失败：${url}`);
            return null;
        } else {
            // 普通 RSS URL
            try {
                return await parser.parseURL(url);
            } catch (error) {
                logger.error(`[RSS] 获取失败 ${url}: ${error.message}`);
                return null;
            }
        }
    }

    /**
     * 检查订阅源中的新条目
     * @param {Object} feed - 订阅源对象
     * @param {string} localId - 订阅源的唯一标识（通常是 URL）
     * @returns {Promise<Array>} 新条目列表
     */
    async checkNewItems(feed, localId) {
        if (!feed || !feed.items || feed.items.length === 0) return [];

        // 检查是否首次处理此订阅
        const count = RssHistory.count(localId);

        if (count === 0) {
            // 首次订阅：将当前所有条目保存到历史记录，防止推送旧内容
            const bulkData = feed.items.map(item => ({
                feedUrl: localId,
                guid: item.guid || item.link || item.title,
                title: item.title
            }));
            RssHistory.bulkCreate(bulkData);
            return [];
        }

        const newItems = [];
        const seenIds = new Set(); // 用于去重

        // 对比数据库检查每个条目
        for (const item of feed.items) {
            const id = item.guid || item.link || item.title;

            // 跳过已处理的 ID（防止同一次检查中的重复）
            if (seenIds.has(id)) continue;
            seenIds.add(id);

            // 检查数据库中是否存在此条目
            const exists = RssHistory.findOne(localId, id);

            if (!exists) {
                newItems.push(item);
            }
        }

        // 反转数组，按时间顺序推送（从旧到新）
        return newItems.reverse();
    }

    /**
     * 记录已处理的条目到数据库
     * @param {string} localId - 订阅源的唯一标识
     * @param {Object} item - 条目对象
     */
    async recordItem(localId, item) {
        const id = item.guid || item.link || item.title;
        RssHistory.create({
            feedUrl: localId,
            guid: id,
            title: item.title
        });
    }

    /**
     * RSS 订阅检查任务（定时任务入口）
     * @param {boolean} force - 是否强制推送（忽略历史记录）
     * @returns {Promise<Object>} 返回统计信息 { total: 订阅总数, pushed: 推送条数 }
     */
    async task(force = false) {
        const feeds = await this.getFeeds();
        if (!feeds.length) return { total: 0, pushed: 0 };

        logger.info(`[RSS] 开始检查 ${feeds.length} 个订阅 (强制=${force})...`);
        let pushedCount = 0;

        for (const sub of feeds) {
            const feed = await this.fetchFeed(sub);
            if (!feed) continue;

            let newItems = [];
            if (force) {
                // 强制模式：获取最近 3 条（避免过多刷屏）
                newItems = feed.items.slice(0, 3).reverse();
            } else {
                // 正常模式：检查新条目
                newItems = await this.checkNewItems(feed, sub.url);
            }

            if (newItems.length > 0) {
                logger.info(`[RSS] 正在推送 ${sub.name} 的 ${newItems.length} 条更新`);
                for (const item of newItems) {
                    // 执行推送并获取推送状态
                    const pushSuccess = await this.broadcast(sub, feed, item);

                    // 只有推送成功才记录到数据库（防止失败后重复推送）
                    if (pushSuccess && !force) {
                        await this.recordItem(sub.url, item);
                    }
                }
                pushedCount += newItems.length;
            }
        }
        return { total: feeds.length, pushed: pushedCount };
    }

    /**
     * 通知管理员推送失败
     * @param {Object} sub - 订阅源配置
     * @param {string} groupId - 群组 ID
     * @param {Error} error - 错误对象
     */
    async notifyOwnerFailure(sub, groupId, error) {
        // 检查是否启用失败通知
        if (!this.config.notify_owner) return;

        const notifyList = Config.masterQQ || [];
        const msg = `[RSS 推送失败]\n订阅: ${sub.name}\n群组: ${groupId}\n错误: ${error.message}`;

        for (const userId of notifyList) {
            await Bot.pickFriend(userId).sendMsg(msg)
                .catch(e => logger.error(`[RSS] 通知管理员失败：${e}`));
        }
    }

    /**
     * 广播推送到所有目标群组
     * @param {Object} sub - 订阅源配置
     * @param {Object} feed - 订阅源对象
     * @param {Object} item - 条目对象
     * @returns {Promise<boolean>} 是否至少有一个群组推送成功
     */
    async broadcast(sub, feed, item) {
        // 渲染图片消息
        const img = await this.render(sub, feed, item);
        const groups = sub.group || this.config.default_group || [];
        let anySuccess = false; // 标记是否有任何群组推送成功

        for (const groupId of groups) {
            let groupSuccess = false;

            if (img) {
                // 优先尝试发送图片消息
                await Bot.sendGroupMsg(groupId, img)
                    .then(() => {
                        groupSuccess = true;
                    })
                    .catch(async err => {
                        logger.error(`[RSS] 图片发送失败：${err.message}`);

                        // 图片发送失败，尝试降级为文本消息 (检查配置)
                        if (this.config.text_push !== false) {
                            const textMsg = `【RSS推送】${sub.name}\n${item.title}\n${item.link}`;
                            await Bot.sendGroupMsg(groupId, textMsg)
                                .then(() => {
                                    logger.info(`[RSS] 图片失败后文本发送成功`);
                                    groupSuccess = true;
                                })
                                .catch(async err2 => {
                                    logger.error(`[RSS] 文本发送也失败：${err2.message}`);
                                    await this.notifyOwnerFailure(sub, groupId, err2);
                                });
                        } else {
                            await this.notifyOwnerFailure(sub, groupId, err);
                        }
                    });
            } else {
                // 渲染失败，直接发送文本消息 (检查配置)
                if (this.config.text_push !== false) {
                    const textMsg = `【RSS推送】${sub.name}\n${item.title}\n${item.link}`;
                    await Bot.sendGroupMsg(groupId, textMsg)
                        .then(() => {
                            groupSuccess = true;
                        })
                        .catch(async err => {
                            logger.error(`[RSS] 文本发送失败：${err.message}`);
                            await this.notifyOwnerFailure(sub, groupId, err);
                        });
                } else {
                    logger.warn(`[RSS] ${sub.name} 渲染失败且文本推送已关闭，跳过推送`);
                }
            }

            // 只要有一个群组成功，就标记为成功
            if (groupSuccess) {
                anySuccess = true;
            }

            // 延迟，避免发送过快
            await Data.sleep(1000);
        }

        // 返回推送结果，用于决定是否记录到数据库
        return anySuccess;
    }

    /**
     * 渲染 RSS 条目为图片
     * @param {Object} sub - 订阅源配置
     * @param {Object} feed - 订阅源对象
     * @param {Object} item - 条目对象
     * @returns {Promise<Buffer|null>} 图片 Buffer，失败返回 null
     */
    async render(sub, feed, item) {
        try {
            let rawContent = item.content || item.summary || item.contentSnippet || '';
            const $ = cheerio.load(rawContent);

            // 1. 提取图片 URL
            let images = [];
            const seenImages = new Set();

            // 支持解析相对路径的基础 URL
            let baseUrl = item.link || sub.url || '';

            $('img, video').each((i, el) => {
                let imgUrl = '';
                const $el = $(el);

                if (el.tagName === 'img') {
                    // 按优先级尝试不同的属性
                    imgUrl = $el.attr('src') ||
                        $el.attr('data-src') ||
                        $el.attr('data-original') ||
                        $el.attr('data-actualsrc') ||
                        $el.attr('data-lazy-src');
                } else if (el.tagName === 'video') {
                    imgUrl = $el.attr('poster');
                }

                if (imgUrl && imgUrl.trim()) {
                    imgUrl = imgUrl.trim();

                    // 处理协议相对路径 //example.com/1.jpg
                    if (imgUrl.startsWith('//')) {
                        imgUrl = 'https:' + imgUrl;
                    }
                    // 处理相对路径 /img/1.jpg
                    else if (imgUrl.startsWith('/') && baseUrl) {
                        try {
                            const urlObj = new URL(baseUrl);
                            imgUrl = urlObj.origin + imgUrl;
                        } catch (e) {
                            // URL 解析失败，保留原样
                        }
                    }
                    // 处理不包含协议的路径 img/1.jpg
                    else if (!imgUrl.startsWith('http') && baseUrl) {
                        try {
                            const urlObj = new URL(baseUrl);
                            const path = urlObj.pathname.split('/').slice(0, -1).join('/') + '/';
                            imgUrl = urlObj.origin + path + imgUrl;
                        } catch (e) {
                            // URL 解析失败，保留原样
                        }
                    }

                    // 如果启用了代理且该 URL 需要代理
                    if (this.config.proxyApi && this.config.proxyApi.enabled && this.config.proxyApi.url) {
                        if (!imgUrl.includes('base64,')) {
                            const proxyUrlTemplate = this.config.proxyApi.url;
                            if (proxyUrlTemplate.includes('{{url}}')) {
                                imgUrl = proxyUrlTemplate.replace('{{url}}', encodeURIComponent(imgUrl));
                            } else {
                                imgUrl = proxyUrlTemplate + imgUrl;
                            }
                        }
                    }

                    if (images.length < 20 && !seenImages.has(imgUrl)) {
                        seenImages.add(imgUrl);
                        images.push(imgUrl);
                    }
                }
            });

            // 2. 删除所有图片和视频标签，因为我们已经提取并准备单独显示
            $('img, video').remove();

            // 3. 清理空标签 (递归删除没有文本且没有子标签的内容)
            $(':empty').remove();
            // 针对只包含空白字符的标签进一步清理
            $('*').each((i, el) => {
                if ($(el).is('p, div, span') && $(el).text().trim() === '' && $(el).children().length === 0) {
                    $(el).remove();
                }
            });

            // 获取处理后的 HTML 内容并压缩多余空行
            let content = $.html('body').replace(/^<body>|<\/body>$/g, '').trim();
            content = content.replace(/\n\s*\n/g, '\n');

            // 准备模板数据
            const data = {
                subName: sub.name,
                pubDate: item.pubDate ? moment(item.pubDate).format('YYYY-MM-DD HH:mm:ss') : '',
                title: item.title,
                content: content,
                images: images,
                link: item.link,
                background: this.config.background || 'https://api.armoe.cn/acg/random',
                seed: Math.random() // 用于避免缓存并增加随机性
            };

            // 使用模板引擎渲染
            return await Render.render('html/rss/rss', {
                ...data,
                waitTime: 6000,
                pageGotoParams: {
                    waitUntil: 'networkidle2'
                }
            });
        } catch (error) {
            logger.error(`[RSS] 渲染错误：${error.message}`);
            return null;
        }
    }
}

export default new RssService();
