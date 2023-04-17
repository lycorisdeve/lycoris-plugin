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
                    fnc: 'searchWp'
                }
            ]
        })
    }

    async getWallpaper(e) {
        const link = await getRandomLinkId()
        if(!link){
            return false
        }
        const imgInfo= await getHDWallpaper(link)
        if(imgInfo){
            e.reply(segment.image(`base64://${imgInfo}`))
        }
     
    }
   async searchWp(e){
       
   }
}
