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
            name: '摸鱼日历',
            /** 功能描述 */
            dsc: '获取摸鱼日历，并定时推送',
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
            let message = '摸鱼日历'
            let img = await getCalendar()
            if (img != false) {
                message = segment.image(img)
            } else {
                message = '摸鱼日历获取失败，请稍后使用 #摸鱼日历 手动获取 ！'
            }

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
        let img = await getCalendar()
        if (img != false) {
            e.reply(segment.image(img))
        }
    }

}

async function getCalendar() {
    try {
        // let url = 'https://api.vvhan.com/api/moyu?type=json';
        let url = 'https://api.j4u.ink/v1/store/other/proxy/remote/moyu.json';
        // 发起第一个GET请求，明确不跟随重定向
        const response = await fetch(url).then(rs => rs.json);
        if (response.code == 200) {
            return response.data.img_url
        }
        else {
            return false
        }

    } catch (error) {
        console.error(error.message);
        throw error;
    }
}
