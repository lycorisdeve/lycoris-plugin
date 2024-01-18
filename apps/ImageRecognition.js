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

            ]
        })
    }

    async picRecognition(e) {
        e = await parseImg(e);
        let url = 'https://api.lolimi.cn/API/AI/gemini.php'
        let msg = '请描述这张图片，并找到这张图片的出处'
        let imgUrl = url + `?msg=${msg}&img=${e.img}`
        let data = await fetch(imgUrl).then(res => res.json()).catch((err) => console.error(err))
        data = data.data
        e.reply([data.output, segment.image(data.imgUrl)])


    }





}