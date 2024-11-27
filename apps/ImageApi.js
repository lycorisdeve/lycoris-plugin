/**
 * @Description 图片获取
 * @author lycoris
 * @time 2023-03-31 23:57
 */
import fetch from 'node-fetch'
import { parseImg } from '../utils/ImgUtils.js'



export class Photo extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: '图片识别',
            /** 功能描述 */
            dsc: '图片识别',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 5000,
            rule: [

                {
                    /** 命令正则匹配 */
                    reg: '^#摸鱼日报|摸鱼日报',
                    /** 执行方法 */
                    fnc: 'moyuDayReport',
                },
                {
                    /** 命令正则匹配 */
                    reg: '日期',
                    /** 执行方法 */
                    fnc: 'todayInfo',
                },
                {
                    /** 命令正则匹配 */
                    reg: '段子|内涵段子|今日段子',
                    /** 执行方法 */
                    fnc: 'neihanduanzi',
                },
                {
                    /** 命令正则匹配 */
                    reg: '摸鱼视频日报',
                    /** 执行方法 */
                    fnc: 'videoMoyuRiBao',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#生成(.*)$',
                    /** 执行方法 */
                    fnc: 'genImg',
                },

            ]
        })
    }

    async moyuDayReport(e) {
        // e = await parseImg(e);
        let url = 'https://dayu.qqsuu.cn/moyuribao/apis.php?type=json'
        let data = await fetch(url).then(res => res.json()).catch((err) => console.error(err))
        e.reply(segment.image(data.data))
    }
    async todayInfo(e) {
        // e = await parseImg(e);
        let url = 'https://dayu.qqsuu.cn/moyurili/apis.php?type=json'
        let data = await fetch(url).then(res => res.json()).catch((err) => console.error(err))
        e.reply(segment.image(data.data))
    }
    async neihanduanzi(e) {
        // e = await parseImg(e);
        let url = 'https://dayu.qqsuu.cn/neihanduanzi/apis.php?type=json'
        let data = await fetch(url).then(res => res.json()).catch((err) => console.error(err))
        e.reply(segment.image(data.data))
    }
    async videoMoyuRiBao(e) {
        // e = await parseImg(e);
        let url = 'https://dayu.qqsuu.cn/moyuribaoshipin/apis.php?type=json'
        let data = await fetch(url).then(res => res.json()).catch((err) => console.error(err))
        e.reply(segment.video(data.data))
    }

    async genImg(e) {
        let tag = e.msg.replace(/#生成/g, "").trim()
        let url = `https://api.linhun.vip/api/huitu?text=${tag}&prompt=水印,最差质量，低质量，裁剪&ratio=宽&apiKey=2842bc94ca70fd0cd4190ee06c51dac4`
        let data = await fetch(url).then(res => res.json()).catch((err) => console.error(err))
        e.reply(data.url, true)

    }





}
/* 
function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
 */