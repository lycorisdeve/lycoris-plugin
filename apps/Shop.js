import fs from 'node:fs';
import { getRandomLinkId, getHDWallpaper } from '../model/services/WallpaperService.js'

export class Shop extends plugin {
    constructor() {
        super({
            name: '彼岸花Shop插件',
            dsc: '彼岸花商店插件',
            event: 'message',
            priority: 1200,
            rule: [
                {
                    reg: "^#?商店$",
                    fnc: 'shop'
                },

            ]
        })
    }

    async shop(e) {
        let link = await getRandomLinkId()
        getHDWallpaper(link)
        let img = `../../resources/wallpaper/${link}`
        if (fs.existsSync(img)) {
            e.reply(segment.image(`file://${img}`))
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
        } else {
            e.reply('查询出错，请重试！')
        }


    }


}
