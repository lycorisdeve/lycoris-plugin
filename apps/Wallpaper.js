import fs from 'node:fs';
import { pluginResources } from '../components/lib/Path.js';
import { getRandomLinkId, getHDWallpaper } from '../model/services/WallpaperService.js'

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
                    fnc: 'versionInfo'
                }
            ]
        })
    }

    async getWallpaper(e) {
        let link = await getRandomLinkId()
        logger.mark(link)
        getHDWallpaper(link)
        let img = `${pluginResources}/wallpaper/${link}`
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
