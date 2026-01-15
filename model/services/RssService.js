
import Parser from 'rss-parser';

import Config from '../../components/Config.js';
import Data from '../../components/Data.js';
import moment from 'moment';
import _ from 'lodash';
import { RssHistory } from '../sqlite3/RssDb.js';
import Render from '../../components/lib/Render.js';

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

class RssService {
    constructor() {
    }

    get config() {
        return Config.getConfig('config').rss || {};
    }

    async getFeeds() {
        const list = this.config.subscribe_list || [];
        const rsshubUrls = this.config.rsshub_url || ['https://rsshub.app'];

        return list.map(item => {
            return { ...item, rsshubUrls };
        });
    }

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
            try {
                return await parser.parseURL(url);
            } catch (error) {
                logger.error(`[RSS] 获取失败 ${url}: ${error.message}`);
                return null;
            }
        }
    }

    async checkNewItems(feed, localId) {
        if (!feed || !feed.items || feed.items.length === 0) return [];

        // 检查是否首次处理此订阅
        const count = RssHistory.count(localId);

        if (count === 0) {
            // 首次：保存当前所有项目到历史记录，防止推送旧内容
            const bulkData = feed.items.map(item => ({
                feedUrl: localId,
                guid: item.guid || item.link || item.title,
                title: item.title
            }));
            RssHistory.bulkCreate(bulkData);
            return [];
        }

        const newItems = [];
        const seenIds = new Set();

        // 对比数据库检查每个项目
        for (const item of feed.items) {
            const id = item.guid || item.link || item.title;

            if (seenIds.has(id)) continue;
            seenIds.add(id);

            // 检查数据库中是否存在
            const exists = RssHistory.findOne(localId, id);

            if (!exists) {
                newItems.push(item);
            }
        }

        // 返回发现的新项目（按时间倒序？代码反转为顺序推送）
        return newItems.reverse();
    }

    // 处理后记录历史的辅助函数
    async recordItem(localId, item) {
        const id = item.guid || item.link || item.title;
        RssHistory.create({
            feedUrl: localId,
            guid: id,
            title: item.title
        });
    }

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
                // 强制模式下，获取最近3条（避免过多刷屏）
                newItems = feed.items.slice(0, 3).reverse();
            } else {
                newItems = await this.checkNewItems(feed, sub.url);
            }

            if (newItems.length > 0) {
                logger.info(`[RSS] 正在推送 ${sub.name} 的 ${newItems.length} 条更新`);
                for (const item of newItems) {
                    await this.broadcast(sub, feed, item);
                    if (!force) {
                        await this.recordItem(sub.url, item);
                    }
                }
                pushedCount += newItems.length;
            }
        }
        return { total: feeds.length, pushed: pushedCount };
    }

    async broadcast(sub, feed, item) {
        const img = await this.render(sub, feed, item);
        const groups = sub.group || this.config.default_group || [];

        for (const groupId of groups) {
            if (img) {
                await Bot.sendGroupMsg(groupId, img).catch(async err => {
                    logger.error(`[RSS] 发送群消息失败：${err}`);
                    // 失败通知
                    const notifyList = Config.masterQQ || [];

                    for (const userId of notifyList) {
                        const msg = `[RSS 推送失败]\n订阅: ${sub.name}\n群组: ${groupId}\n错误: ${err.message}`;
                        await Bot.pickFriend(userId).sendMsg(msg).catch(e => logger.error(`[RSS] 通知管理员失败：${e}`));
                    }
                });
            } else {
                // 如果渲染失败，回退到简单的文本消息
                const textMsg = `【RSS推送】${sub.name}\n${item.title}\n${item.link}`;
                logger.error(`[RSS] 发送回退消息：${textMsg}`);
            }
            await Data.sleep(1000);
        }
    }

    async render(sub, feed, item) {
        try {
            let content = item.content || item.summary || item.contentSnippet || '';

            // 从内容中提取图片
            const imgReg = /<img.*?src=["'](.*?)["'].*?>/g;
            let images = [];
            let match;
            const seenImages = new Set();
            while ((match = imgReg.exec(content)) !== null) {
                const imgUrl = match[1];
                if (images.length < 20 && imgUrl && imgUrl.trim()) { // 限制为20张图片以适应HTML布局
                    if (!seenImages.has(imgUrl)) {
                        seenImages.add(imgUrl);
                        images.push(imgUrl);
                    }
                }
            }

            // 准备 art-template 数据
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

            return await Render.render('html/rss/rss', {
                ...data,
                waitTime: 2000,
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
