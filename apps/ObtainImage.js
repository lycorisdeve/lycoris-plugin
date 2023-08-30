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
                {
                    /** 命令正则匹配 */
                    reg: '^#mm写真$',
                    /** 执行方法 */
                    fnc: 'mmImage',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#动漫写真$',
                    /** 执行方法 */
                    fnc: 'btSearch',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#高清写真$',
                    /** 执行方法 */
                    fnc: 'HDPhoto',
                }
            ]
        })
    }


    async mmImage(e) {

        let url = `https://api.r10086.com/img-api.php?type=`
    }
    async HDPhoto(e) {

        const url = `https://xiaobai.klizi.cn/API/img/game.php`
        let imgUrl = await fetch(url).then(res => res.text()).catch((err) => console.error(err))
        logger.info(result)
        let img = await fetch(imgUrl).then(res => res.text()).catch((err) => console.error(err))
        e.reply(img)

    }



}
