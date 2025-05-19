import axios from 'axios'
import Config from '../components/Config.js'

/*
 * @description: read60s推送
 * @author: lycoris
 * @date: undefined
 */
const config = Config.getConfig('config')

const API_CONFIG = {
    DEFAULT: 'https://api.2xb.cn/zaob',
    BACKUP1: 'https://api.jun.la/60s.php?format=imgapi',
    BACKUP2: {
        url: 'https://v2.alapi.cn/api/zaobao',
        token: 'yTrBjcOSMko6kIEL'
    },
    BACKUP3: 'https://api.03c3.cn/api/zb?type=jsonImg',
    BACKUP4: 'https://api.j4u.ink/v1/store/other/proxy/remote/news/60.json'
}

const plugin_config = config.read60s
const CRON_EXPRESSION = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`;

export class Read60sPlugin extends plugin {
    constructor() {
        super({
            name: '60S新闻',
            dsc: '获取60S新闻，并定时推送',
            event: 'message',
            priority: 1200,
            rule: [
                {
                    reg: '^#news$|^今日新闻$|^#新闻$|^60S新闻$',
                    fnc: 'getRead60sNews'
                },
                {
                    reg: '^#news1$|^今日新闻1$|^#新闻1$|^60S新闻1$',
                    fnc: 'getRead60sNews1'
                },
                {
                    reg: '^#news2$|^今日新闻2$|^#新闻2$|^60S新闻2$',
                    fnc: 'getRead60sNews2'
                },
                {
                    reg: '^#news3$|^今日新闻3$|^#新闻3$|^60S新闻3$',
                    fnc: 'getRead60sNews3'
                },
                {
                    reg: '^#news4$|^今日新闻4$|^#新闻4$|^60S新闻4$',
                    fnc: 'getRead60sNews4'
                }
            ]
        })
        this.task = {
            name: 'read60s定时推送',
            fnc: () => this.sendRandomImage(),
            cron: CRON_EXPRESSION
        }
    }

    // 通用的新闻获取和回复方法
    async handleNewsRequest(e, fetchFunction) {
        try {
            const imgMsg = await fetchFunction();
            if (imgMsg) {
                await e.reply(imgMsg);
                return true;
            }
        } catch (error) {
            logger.error('获取新闻失败:', error);
        }
        await e.reply("没有获取到今日新闻！");
        return false;
    }

    // 通用的图片获取方法
    async fetchImageFromApi(url, dataProcessor) {
        const response = await axios.get(url);
        return dataProcessor(response.data);
    }

    async getRead60sNews(e) {
        return this.handleNewsRequest(e, getNewsImage);
    }

    async getRead60sNews1(e) {
        const fetchImage = async () => {
            const response = await axios.get(API_CONFIG.BACKUP1);
            let imageUrl = response.data.imageBaidu || response.data.imageUrl;
            return segment.image(imageUrl);
        };
        return this.handleNewsRequest(e, fetchImage);
    }

    async getRead60sNews2(e) {
        const fetchImage = async () => {
            const url = `${API_CONFIG.BACKUP2.url}?format=json&token=${API_CONFIG.BACKUP2.token}`;
            const response = await axios.get(url);
            return segment.image(response.data.data.image);
        };
        return this.handleNewsRequest(e, fetchImage);
    }

    async getRead60sNews3(e) {
        const fetchImage = async () => {
            const response = await axios.get(API_CONFIG.BACKUP3);
            return segment.image(response.data.data.imageurl);
        };
        return this.handleNewsRequest(e, fetchImage);
    }

    async getRead60sNews4(e) {
        const fetchImage = async () => {
            const response = await axios.get(API_CONFIG.BACKUP4);
            const data = response.data.data;
            const dateInfo = this.formatDateInfo(data);
            const imgMsg = segment.image(data.image);
            return { imgMsg, dateInfo };
        };

        try {
            const { imgMsg, dateInfo } = await fetchImage();
            await e.reply(imgMsg);
            await e.reply(dateInfo);
            return true;
        } catch (error) {
            logger.error('获取新闻失败:', error);
            await e.reply("没有获取到今日新闻！");
            return false;
        }
    }

    formatDateInfo(data) {
        return `
        日期：${data.date}
        星期：${data.weekDay}
        年份：${data.yearTip}
        类型：${data.typeDes}
         属 ：${data.chineseZodiac}
        节气：${data.solarTerms}
        农历：${data.lunarCalendar}
        宜：${data.suit}
        忌：${data.avoid}
        星座：${data.constellation}
        天数：${data.daysOfYear}
        周数：${data.weekOfYear}
        `;
    }

    async sendRandomImage() {
        if (!plugin_config.isPush) return;
        try {
            const message = await getNewsImage();
            const sendPromises = [
                ...plugin_config.private_ids.map(qq =>
                    Bot.sendPrivateMsg(qq, message).catch(err => logger.error(err))
                ),
                ...plugin_config.group_ids.map(qqGroup =>
                    Bot.sendGroupMsg(qqGroup, message).catch(err => logger.error(err))
                )
            ];
            await Promise.all(sendPromises);
        } catch (error) {
            logger.error('Error sending messages:', error);
        }
    }
}

async function getNewsImage() {
    const apis = [
        {
            url: API_CONFIG.DEFAULT,
            process: data => segment.image(data.imageUrl)
        },
        {
            url: API_CONFIG.BACKUP1,
            process: data => segment.image(data.imageBaidu || data.imageUrl)
        },
        {
            url: `${API_CONFIG.BACKUP2.url}?format=json&token=${API_CONFIG.BACKUP2.token}`,
            process: data => segment.image(data.data.image)
        }
    ];

    for (const api of apis) {
        try {
            const response = await axios.get(api.url);
            return api.process(response.data);
        } catch (error) {
            logger.error(`API ${api.url} failed:`, error);
            continue;
        }
    }
    throw new Error('All APIs failed');
}



