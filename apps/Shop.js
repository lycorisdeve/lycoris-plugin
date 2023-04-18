import { pluginName } from "../components/lib/Path.js";

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
                {
                    reg: "^#?购买商品(.*)$",
                    fnc: 'buy'
                },

            ]
        })
    }

    async shop(e) {
        let data = {
            tplFile: `./plugins/${pluginName}/resources/shop/shop-list.html`,
        }
        let img = await puppeteer.screenshot("shop", {
            ...data,
        });

        await e.reply(img, false, { at: true })


    }
    async buy(e) {
        let message = e.msg
        let keywordAndNum = message.replace(/#购买商品/g, '');
        // 使用正则表达式匹配关键字和数字
        const regex = /(.+?)(\d+)/;
        const match = keywordAndNum.match(regex);

        if (match) {
            const keyword = match[1];
            const quantity = parseInt(match[2], 10);
            if (keyword === '相遇之缘') {
                let money = 160 * quantity
                let mySignInInfo = await redis.get("Lycoris:checkIn:" + e.user_id)
                let primogems = parseInt(mySignInInfo.primogems)
                if (primogems < money) {
                    e.reply('原石不足哦~~~~~~~~~~~~~~~~~~~~')
                } else {
                    let coinJson = await redis.get(`Yz:flower-plugin:coin:${e.user_id}`)
                    if (coinJson) {
                        let coin = JSON.parse(coinJson)
                        coin.blue += quantity
                        await redis.set(`Yz:flower-plugin:coin:${e.user_id}`, coin, { EX: 1681847999 })
                    } else {
                        let coin = {
                            "pink": 0,
                            "blue": quantity,
                            "expire": 1681847999
                        }

                        await redis.set(`Yz:flower-plugin:coin:${e.user_id}`, coin, { EX: 1681847999 })
                    }

                    e.reply(`购买成功！本次购买 ${quantity}个相遇之缘，共花费 ${money} 原石,剩余 ${primogems - money} 原石`)
                }
            } else if (keyword === '纠缠之缘') {
                let money = 160 * quantity
                let mySignInInfo = await redis.get("Lycoris:checkIn:" + e.user_id)
                mySignInInfo = JSON.parse(mySignInInfo)
                let primogems = parseInt(mySignInInfo.primogems)

                if (primogems < money) {
                    e.reply('原石不足哦~~~~~~~~~~~~~~~~~~~~')
                } else {
                    let coinJson = await redis.get(`Yz:flower-plugin:coin:${e.user_id}`)
                    if (coinJson) {
                        let coin = JSON.parse(coinJson)
                        coin.pink += quantity

                        await redis.set(`Yz:flower-plugin:coin:${e.user_id}`, JSON.stringify(coin), { EX: 1681847999 })
                        mySignInInfo.primogems = primogems - money

                        await redis.set("Lycoris:checkIn:" + e.user_id, JSON.stringify(mySignInInfo), { EX: 3600 * 24 * 90 })
                    } else {
                        let coin = {
                            "pink": quantity,
                            "blue": 0,
                            "expire": 1681847999
                        }
                        mySignInInfo.primogems = primogems - money

                        await redis.set("Lycoris:checkIn:" + e.user_id, JSON.stringify(mySignInInfo), { EX: 3600 * 24 * 90 })
                        await redis.set(`Yz:flower-plugin:coin:${e.user_id}`, JSON.stringify(coin), { EX: 1681847999 })
                    }

                    e.reply(`购买成功！本次购买 ${quantity}个纠缠之缘，共花费 ${money} 原石,剩余 ${primogems - money} 原石`)
                }
            } else if (keyword === '一级好感度卡') {
                e.reply('待开发功能~~~~')
            } else if (keyword === '二级好感度卡') {
                e.reply('待开发功能~~~~')
            } else if (keyword === '三级好感度卡') {
                e.reply('待开发功能~~~~')
            } else {
                e.reply('木得这个商品')
            }

        } else {
            e.reply('请输入购买数量,如：#购买纠缠之缘10个')
            return false;
        }


    }


}
