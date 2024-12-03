import axios from 'axios'
import Config from '../model/config.js'

/*
 * @description: read60s推送
 * @author: lycoris
 * @date: undefined
 */
const config = Config.getConfig('config')



const plugin_config = config.moyu
const CRON_EXPRESSION = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`;


export class MoyuCalendarPlugin extends plugin {
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
                    reg: '^#摸鱼日历$',
                    /** 执行方法 */
                    fnc: 'replyMoyuCalendar'
                }
            ]
        })
        this.task = {
            /** 任务名 */
            name: 'read60s定时推送',
            /** 任务方法名 */
            fnc: () => this.sendCornMoyuImage(),
            /** 任务cron表达式 */
            cron: CRON_EXPRESSION
        }


    }

    async sendCornMoyuImage() {
        try {
            let imageBuffer = await getCalendar()
            let message = segment.image(imageBuffer)

            for (const qq of plugin_config.private_ids) {
                Bot.sendPrivateMsg(qq, message).catch((err) => {
                    logger.error(err)
                })
                await nonebot.get_bot().sendPrivateMsg(qq, message);
            }

            for (const qqGroup of plugin_config.group_ids) {
                Bot.sendGroupMsg(qqGroup, message).catch((err) => {
                    logger.error(err)
                })
            }
        } catch (error) {
            logger.error('Error sending messages:', error);
        }
    }

    async replyMoyuCalendar(e) {
        getCalendar().then(imageBuffer => {
            // 使用imageBuffer作为图片发送
            e.reply(segment.image(imageBuffer));
        }).catch(error => {
            console.error(error);
            e.reply('摸鱼日历获取失败，请稍后再试。');
        });
    }

}

async function getCalendar() {
    try {
        // 发起第一个GET请求，明确不跟随重定向
        const response = await fetch('https://api.vvhan.com/api/moyu', {
            redirect: 'manual' // 禁用自动重定向
        });

        if (response.status !== 302) {
            throw new Error(`摸鱼日历获取失败，错误码：${response.status}`);
        }

        // 获取重定向的URL
        const imageUrl = response.headers.get('location');
        if (!imageUrl) {
            throw new Error('无法找到重定向的URL');
        }

        // 发起第二个GET请求以获取图片内容
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`获取图片失败，错误码：${imageResponse.status}`);
        }

        // 将响应体作为Buffer返回
        const imageBuffer = await imageResponse.buffer();
        return imageBuffer;

    } catch (error) {
        console.error(error.message);
        throw error;
    }
}
