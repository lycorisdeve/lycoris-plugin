import axios from 'axios'
import cheerio from 'cheerio'
import Config from '../components/Config.js'

/*
 * @description: 新闻RSS订阅
 * @author: lycoris
 * @date: undefined
 */
const config = Config.getConfig('config')

// RSS API配置
const API_CONFIG = {
    DEFAULT: 'https://api.yinrss.com/feed',
    PARAMS: config.newsRss?.params || {
        limit: 10,
        id: '',
        media: '',
        keyword: 'AI'
    }
}

// 从配置文件中读取插件配置
const plugin_config = config.newsRss || {
    isPush: false,
    schedule: {
        second: '0',
        minute: '0',
        hour: '8'
    },
    private_ids: [],
    group_ids: []
}

export class NewsRssPlugin extends plugin {
    constructor() {
        super({
            name: 'RSS新闻',
            dsc: '获取RSS新闻，支持关键词和媒体筛选',
            event: 'message',
            priority: 1200,
            rule: [
                {
                    reg: '^#rss$|^#RSS$|^#新闻订阅$',
                    fnc: 'getDefaultRss'
                },
                {
                    reg: '^#rss搜索(.*)$|^#RSS搜索(.*)$',
                    fnc: 'searchRss'
                },
                {
                    reg: '^#rss媒体(.*)$|^#RSS媒体(.*)$',
                    fnc: 'getMediaRss'
                }
            ]
        })

        // 定时任务，如果启用推送功能
        if (plugin_config.isPush) {
            this.task = {
                name: 'RSS新闻定时推送',
                fnc: () => this.pushRssNews(),
                cron: `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`
            }
        }
    }

    // 获取默认RSS新闻（AI相关）
    async getDefaultRss(e) {
        return this.handleRssRequest(e, API_CONFIG.PARAMS);
    }

    // 根据关键词搜索RSS新闻
    async searchRss(e) {
        let keyword = e.msg.replace(/#rss搜索|#RSS搜索/g, "").trim();
        if (!keyword) {
            await e.reply("请输入搜索关键词");
            return false;
        }

        const params = {
            ...API_CONFIG.PARAMS,
            keyword: keyword
        };

        return this.handleRssRequest(e, params);
    }

    // 获取特定媒体的RSS新闻
    async getMediaRss(e) {
        let media = e.msg.replace(/#rss媒体|#RSS媒体/g, "").trim();
        if (!media) {
            await e.reply("请输入媒体名称");
            return false;
        }

        const params = {
            ...API_CONFIG.PARAMS,
            media: media
        };

        return this.handleRssRequest(e, params);
    }

    // 处理RSS请求的通用方法
    async handleRssRequest(e, params) {
        try {
            await e.reply("正在获取RSS新闻，请稍候...");
            const news = await this.fetchRssNews(params);

            if (news && news.length > 0) {
                const msgList = this.formatNewsToForwardMsg(news, e);
                await e.reply(await Bot.makeForwardMsg(msgList));
                return true;
            } else {
                await e.reply("未获取到相关新闻");
                return false;
            }
        } catch (error) {
            logger.error('获取RSS新闻失败:', error);
            await e.reply(`获取RSS新闻失败: ${error.message}`);
            return false;
        }
    }

    // 从API获取RSS新闻
    async fetchRssNews(params) {
        try {
            const url = new URL(API_CONFIG.DEFAULT);
            Object.keys(params).forEach(key => {
                if (params[key]) {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await axios.get(url.toString(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            });

            // 处理新的API返回格式
            if (response.data && response.data.errno === 0 && Array.isArray(response.data.data)) {
                return response.data.data;
            } else if (response.data && response.data.items) {
                // 保留对旧格式的兼容
                return response.data.items;
            } else if (response.data && Array.isArray(response.data)) {
                // 保留对旧格式的兼容
                return response.data;
            }

            return [];
        } catch (error) {
            logger.error(`RSS API请求失败: ${error.message}`);
            throw error;
        }
    }

    // 格式化新闻为转发消息
    formatNewsToForwardMsg(news, e) {
        const msgList = [];

        // 添加标题消息
        msgList.push({
            message: `RSS新闻订阅 (共${news.length}条)`,
            nickname: Bot.nickname,
            user_id: Bot.uin
        });

        // 添加每条新闻
        news.forEach((item, index) => {
            let content = `${index + 1}. ${item.title || '无标题'}\n`;

            // 处理新的API返回格式
            if (item.source && typeof item.source === 'string') {
                content += `来源: ${item.source}\n`;
            } else if (item.source && item.source.title) {
                // 兼容旧格式
                content += `来源: ${item.source.title}\n`;
            }

            if (item.date) {
                const date = new Date(item.date);
                content += `发布时间: ${date.toLocaleString()}\n`;
            } else if (item.pubDate) {
                // 兼容旧格式
                const date = new Date(item.pubDate);
                content += `发布时间: ${date.toLocaleString()}\n`;
            }

            if (item.url) {
                content += `链接: ${item.url.trim()}\n`;
            } else if (item.link) {
                // 兼容旧格式
                content += `链接: ${item.link}\n`;
            }

            if (item.description) {
                // 使用cheerio清理HTML标签
                const $ = cheerio.load(item.description);
                content += `${$.text().substring(0, 100)}...\n`;
            }

            if (item.img) {
                content += segment.image(item.img);
            }

            msgList.push({
                message: content,
                nickname: Bot.nickname,
                user_id: Bot.uin
            });
        });

        return msgList;
    }

    // 定时推送RSS新闻
    async pushRssNews() {
        if (!plugin_config.isPush) return;

        try {
            const news = await this.fetchRssNews(API_CONFIG.PARAMS);
            if (!news || news.length === 0) return;

            const msgList = this.formatNewsToForwardMsg(news);
            const forwardMsg = await Bot.makeForwardMsg(msgList);

            const sendPromises = [
                ...plugin_config.private_ids.map(qq =>
                    Bot.sendPrivateMsg(qq, forwardMsg).catch(err => logger.error(err))
                ),
                ...plugin_config.group_ids.map(qqGroup =>
                    Bot.sendGroupMsg(qqGroup, forwardMsg).catch(err => logger.error(err))
                )
            ];

            await Promise.all(sendPromises);
        } catch (error) {
            logger.error('RSS新闻推送失败:', error);
        }
    }
}