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
                    reg: '^#出处',
                    /** 执行方法 */
                    fnc: 'picRecognition',
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

    async picRecognition(e) {
        e = await parseImg(e);
        let url = 'https://api.lolimi.cn/API/AI/gemini.php'
        let msg = '请描述这张图片，并找到这张图片的出处，最好给出具体番号，或者相似图片链接!'
        let imgUrl = url + `?msg=${msg}&img=${e.img}`
        let data = await fetch(imgUrl).then(res => res.json()).catch((err) => console.error(err))
        data = data.data
        console.log(data)
        if (data.output != '') {
            e.reply([data.output, segment.image(data.image)])
        } else {
            e.reply("没有找到出处！")
        }
    }

    async genImg(e) {
        let tag = e.msg.replace(/#生成/g, "").trim()
        let url = `https://api.linhun.vip/api/huitu?text=${tag}&prompt=水印,最差质量，低质量，裁剪&ratio=宽&apiKey=2842bc94ca70fd0cd4190ee06c51dac4`
        let data = await fetch(url).then(res => res.json()).catch((err) => console.error(err))
        /* 
        {
    "code": 200,
    "msg": "查询成功",
    "text": "网络键盘侠",
    "url": "https://www.cwjiaoyu.cn/img_generate_task/4b207733-0cfa-40d9-8138-90c7fcea1458"
}
        */
        /* e.reply(`请耐心等待30S！`)
        await sleep(30) */
        e.reply(data.url, true)

    }





}
/* 
function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
 */