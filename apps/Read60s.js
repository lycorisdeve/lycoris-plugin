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
                    reg: '^#news$|^今日新闻$|^#新闻$|^60S新闻$',
                    /** 执行方法 */
                    fnc: 'getRead60sNews'
                }, {
                    /** 命令正则匹配 */
                    reg: '^#news1$|^今日新闻1$|^#新闻1$|^60S新闻1$',
                    /** 执行方法 */
                    fnc: 'getRead60sNews1'
                }, {
                    /** 命令正则匹配 */
                    reg: '^#news2$|^今日新闻2$|^#新闻2$|^60S新闻2$',
                    /** 执行方法 */
                    fnc: 'getRead60sNews2'
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
    async getRead60sNews1(e) {
        const url = 'https://api.jun.la/60s.php?format=imgapi';
        const response = await axios.get(url);
        const retdata = response.data;
        const imageUrl = retdata.imageBaidu;
        if (!imageUrl) {
            imageUrl = retdata.imageUrl
        }
        // const picCqCode = `[CQ:image,file=${imageUrl}]`;
        let msg = segment.image(imageUrl)
        let imgMsg = msg
        if (imgMsg) {
            e.reply(imgMsg)
        } else {
            e.reply("没有获取到今日新闻！")
        }

    }
    async getRead60sNews2(e) {
        const token = "yTrBjcOSMko6kIEL"
        const url = `https://v2.alapi.cn/api/zaobao?format=json&token=${token}`;
        const response = await axios.get(url);
        const retdata = response.data;
        const imageUrl = retdata.data.image;
        // const picCqCode = `[CQ:image,file=${imageUrl}]`;
        let imgMsg = segment.image(imageUrl)
        if (imgMsg) {
            e.reply(imgMsg)
        } else {
            e.reply("没有获取到今日新闻！")
        }

    }
    async getRead60sNews3(e) {
        const url = `https://api.03c3.cn/api/zb?type=jsonImg`;
        const response = await axios.get(url);
        const retdata = response.data;
        const imageUrl = retdata.data.imageurl;
        // const picCqCode = `[CQ:image,file=${imageUrl}]`;
        let imgMsg = segment.image(imageUrl)
        if (imgMsg) {
            e.reply(imgMsg)
        } else {
            e.reply("没有获取到今日新闻！")
        }

    }



    async sendRandomImage() {
        try {
            const message = await getNewsImage();
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



}

async function getNewsImage() {
    try {
        const url = 'https://api.jun.la/60s.php?format=imgapi';
        const response = await axios.get(url);
        const retdata = response.data;
        const imageUrl = retdata.imageBaidu;
        if (!imageUrl) {
            imageUrl = retdata.imageUrl
        }
        // const picCqCode = `[CQ:image,file=${imageUrl}]`;
        let msg = segment.image(imageUrl)
        return msg;
    } catch {
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
            const token = "yTrBjcOSMko6kIEL"
            const url = `https://v2.alapi.cn/api/zaobao?format=json&token=${token}`;
            const response = await axios.get(url);
            logger.mark(response)
            const retdata = response.data;
            const imageUrl = retdata.data.image;
            // const picCqCode = `[CQ:image,file=${imageUrl}]`;
            let msg = segment.image(imageUrl)
            return msg;

        }

    }
}



