/**
 * @Description 图片获取
 * @author lycoris
 * @time 2023-03-31 23:57
 */
import fetch from 'node-fetch'



export class Photo extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: '图片获取',
            /** 功能描述 */
            dsc: '图片获取',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 5000,
            rule: [
                // {
                //     /** 命令正则匹配 */
                //     reg: '^#mm写真$',
                //     /** 执行方法 */
                //     fnc: 'mmImage',
                // },
                {
                    /** 命令正则匹配 */
                    reg: '^#动漫写真$',
                    /** 执行方法 */
                    fnc: 'btSearch',
                },
                {
                    /** 命令正则匹配 */
                    reg: '写真',
                    /** 执行方法 */
                    fnc: 'HDPhoto',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#高清壁纸$',
                    /** 执行方法 */
                    fnc: 'HDWallpaper',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#游戏壁纸$',
                    /** 执行方法 */
                    fnc: 'HDGame',
                },
                {
                    /** 命令正则匹配 */
                    reg: '肝|太强了|带带',
                    /** 执行方法 */
                    fnc: 'pic',
                },
            ]
        })
    }

    /*     async mmImage(e) {
            let url = `https://api.r10086.com/img-api.php?type=`
    
        } */
    async HDPhoto(e) {
        const url = `https://xiaobai.klizi.cn/API/img/beauty.php?data=&`
        let imgUrl = await fetch(url).then(res => res.text()).catch((err) => console.error(err))
        e.reply(segment.image(imgUrl))
    }
    async HDWallpaper(e) {

        const url = `https://xiaobai.klizi.cn/API/img/bizhi.php`
        let imgUrl = await fetch(url).then(res => res.text()).catch((err) => console.error(err))
        e.reply(segment.image(imgUrl))

    }
    async HDGame(e) {
        const url = `https://xiaobai.klizi.cn/API/img/game.php`
        let imgUrl = await fetch(url).then(res => res.text()).catch((err) => console.error(err))
        e.reply(segment.image(imgUrl))

    }
    async pic(e) {
        const url = `https://api.lolimi.cn/API/tup/xjj.php`
        let imgInfo = await fetch(url)
        e.reply(segment.image(`base64://${imgInfo}`))
    }




}
