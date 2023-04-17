import fs from 'node:fs';
import { pluginResources } from '../components/lib/Path.js';
import { getRandomLinkId, getHDWallpaper, searchImage } from '../model/services/WallpaperService.js'
import { segment } from 'icqq';

export class Wallpaper extends plugin {
    constructor() {
        super({
            name: '彼岸花壁纸插件',
            dsc: '彼岸花壁纸插件',
            event: 'message',
            priority: 1200,
            rule: [
                {
                    reg: "^#?来一张壁纸$",
                    fnc: 'getWallpaper'
                },
                {
                    reg: "^#?壁纸搜索(*)$",
                    fnc: 'searchWp'
                }
            ]
        })
    }

    async getWallpaper(e) {
        const link = await getRandomLinkId()
        if (!link) {
            return false
        }
        const imgInfo = await getHDWallpaper(link)
        if (imgInfo) {
            e.reply(segment.image(`base64://${imgInfo}`))
        }

    }
    async searchWp(e) {
        let keyword = e.msg.replace(/#壁纸搜索/g, "").trim()
        // 翻译中文
        let chReg = /(?:[\u3400-\u4DB5\u4E00-\u9FEA\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0])+/
        if (chReg.test(keyword)) {
            e.reply('只支持英文搜索关键词，翻译ing~~~请稍候', true, { recallMsg: 15 })
            keyword = await trans(keyword)
            if (chReg.test(keyword)) {
                return await e.reply("翻译接口寄了，请尝试避免使用中文字符")
            }
        }
        const imgInfos = searchImage(keyword)
        let msgs = []
        imgInfos.forEach(img => {
            const prefix = img.imgName.substring(0, 2);
            const url = `https://w.wallhaven.cc/full/${prefix}/wallhaven-${img.imgName}`;
            let msg = `[CQ:image,file=${img.imgUrl}]\n${url}`
            msgs.push(msg);
        })
        e.reply(msgs);
    }
}
async function trans(tg) {
    let chReg = /([\u3400-\u4DB5\u4E00-\u9FEA\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0])+/g
    // let CH_list = [...Object.values(tg.match(chReg))]
    let CH_list = tg.match(chReg)
    if (!CH_list || CH_list.length == 0) { return tg }
    for (let i = 0; i < CH_list.length; i++) {

        let en = await Translate.t(CH_list[i])
        tg = tg.replace(CH_list[i], en.toLowerCase())

    }
    return tg
}