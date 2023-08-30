/**
 * @Description 图片获取
 * @author lycoris
 * @time 2023-03-31 23:57
 */
import axios from 'axios'
import * as cheerio from 'cheerio';


export class Photo extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'bt搜索',
            /** 功能描述 */
            dsc: 'bt搜索',
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
        
        let url=`https://api.r10086.com/img-api.php?type=`
    }
    async HDPhoto(e) {
        
        let url=`https://xiaobai.klizi.cn/API/img/game.php`


    }



}
