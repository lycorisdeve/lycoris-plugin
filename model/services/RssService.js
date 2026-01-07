
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

        // If it's an RSSHub URL, try multiple instances
        if (url.includes('${rsshub_url}')) {
            for (const baseUrl of rsshubUrls) {
                const targetUrl = url.replace('${rsshub_url}', baseUrl);
                try {
                    const feed = await parser.parseURL(targetUrl);
                    if (feed) return feed;
                } catch (error) {
                    logger.warn(`[RSS] RSSHub instance failed: ${baseUrl} - ${error.message}`);
                    continue;
                }
            }
            logger.error(`[RSS] All RSSHub instances failed for ${url}`);
            return null;
        } else {
            try {
                return await parser.parseURL(url);
            } catch (error) {
                logger.error(`[RSS] Fetch error for ${url}: ${error.message}`);
                return null;
            }
        }
    }

    async checkNewItems(feed, localId) {
        if (!feed || !feed.items || feed.items.length === 0) return [];

        // Check if it's the first time processing this feed
        const count = RssHistory.count(localId);

        if (count === 0) {
            // First time: Save all current items to history so we don't push old content
            const bulkData = feed.items.map(item => ({
                feedUrl: localId,
                guid: item.guid || item.link || item.title,
                title: item.title
            }));
            RssHistory.bulkCreate(bulkData);
            return [];
        }

        const newItems = [];

        // Check each item against DB
        for (const item of feed.items) {
            const id = item.guid || item.link || item.title;

            // Check if exists in DB
            const exists = RssHistory.findOne(localId, id);

            if (!exists) {
                newItems.push(item);
            }
        }

        // Return found new items (oldest first for chronological pushing, or newest? code said reverse)
        // feed.items usually gives newest first. We want to push from oldest new item to newest new item?
        // Original code: return newItems.reverse(); 
        return newItems.reverse();
    }

    // Helper to record history after processing
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

        logger.info(`[RSS] Start checking ${feeds.length} feeds (force=${force})...`);
        let pushedCount = 0;

        for (const sub of feeds) {
            const feed = await this.fetchFeed(sub);
            if (!feed) continue;

            let newItems = [];
            if (force) {
                // In force mode, take the 3 most recent items (avoiding too much spam)
                newItems = feed.items.slice(0, 3).reverse();
            } else {
                newItems = await this.checkNewItems(feed, sub.url);
            }

            if (newItems.length > 0) {
                logger.info(`[RSS] Pushing ${newItems.length} items for ${sub.name}`);
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
                await Bot.sendGroupMsg(groupId, img).catch(err => logger.error(`[RSS] Send group msg error: ${err}`));
            } else {
                // Fallback to simple text if render fails
                const textMsg = `【RSS推送】${sub.name}\n${item.title}\n${item.link}`;
                // await Bot.sendGroupMsg(groupId, textMsg).catch(err => logger.error(`[RSS] Send fallback msg error: ${err}`));
                logger.error(`[RSS] Send fallback msg : ${textMsg}`);
            }
            await Data.sleep(1000);
        }
    }

    async render(sub, feed, item) {
        try {
            let content = item.content || item.summary || item.contentSnippet || '';

            // Extract images from content
            const imgReg = /<img.*?src=["'](.*?)["'].*?>/g;
            let images = [];
            let match;
            while ((match = imgReg.exec(content)) !== null) {
                if (images.length < 9) { // Limit to 9 images for HTML layout
                    images.push(match[1]);
                }
            }

            // Prepare data for art-template
            const data = {
                subName: sub.name,
                pubDate: item.pubDate ? moment(item.pubDate).format('YYYY-MM-DD HH:mm:ss') : '',
                title: item.title,
                content: content,
                images: images,
                link: item.link,
                background: this.config.background || 'https://api.armoe.cn/acg/random',
                seed: Math.random() // Used to avoid cache and add randomness
            };

            return await Render.render('html/rss/rss', {
                ...data,
                waitTime: 2000,
                pageGotoParams: {
                    waitUntil: 'networkidle2'
                }
            });
        } catch (error) {
            logger.error(`[RSS] Render error: ${error.message}`);
            return null;
        }
    }
}

export default new RssService();
