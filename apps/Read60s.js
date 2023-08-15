import axios from 'axios'
import Config from '../model/config.js'

/*
 * @description: read60s推送
 * @author: lycoris
 * @date: undefined
 */
const config = Config.getConfig('config')



const plugin_config = config.read60s
const CRON_EXPRESSION = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`;


export class EpicGamesPlugin extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: '60S新闻',
            /** 功能描述 */
            dsc: '获取60S新闻，并定时推送',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1200,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '#news|今日新闻|#新闻|60S新闻',
                    /** 执行方法 */
                    fnc: 'getRead60sNews'
                }
            ]
        })
        this.task = {
            /** 任务名 */
            name: 'read60s定时推送',
            /** 任务方法名 */
            fnc: () => this.sendRandomImage(),
            /** 任务cron表达式 */
            cron: CRON_EXPRESSION
        }


    }

    async getRead60sNews(e) {
        let imgMsg = await getNewsImage()
        if (imgMsg) {
            e.reply(imgMsg)
        } else {
            e.reply("没有获取到今日新闻！")
        }

    }



    async sendRandomImage() {
        try {
            const message = await getNewsImage();
            for (const qq of plugin_config.qq_friends) {
                Bot.sendPrivateMsg(qq, message).catch((err) => {
                    logger.error(err)
                })
                await nonebot.get_bot().sendPrivateMsg(qq, message);
            }

            for (const qqGroup of plugin_config.qq_groups) {
                Bot.sendGroupMsg(qqGroup, message).catch((err) => {
                    logger.error(err)
                })
            }
        } catch (error) {
            logger.error('Error sending messages:', error);
        }
    }



}

async function getNewsImage() {
    try {
        const url = 'https://api.2xb.cn/zaob'; // 备用网址
        const response = await axios.get(url);
        const retdata = response.data;
        const imageUrl = retdata.imageUrl;
        // const picCqCode = `[CQ:image,file=${imageUrl}]`;
        // return picCqCode;
        let msg = segment.image(imageUrl)
        return msg;

    } catch {
        const url = 'https://api.iyk0.com/60s';
        const response = await axios.get(url);
        const retdata = response.data;
        const imageUrl = retdata.imageUrl;
        // const picCqCode = `[CQ:image,file=${imageUrl}]`;
        let msg = segment.image(imageUrl)
        return msg;
    }
}



