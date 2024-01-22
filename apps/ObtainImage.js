/**
 * @Description 图片获取
 * @author lycoris
 * @time 2023-03-31 23:57
 */
import fetch from 'node-fetch'

const sleep = time => {
    return new Promise(resolve => setTimeout(resolve, time));
};



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
                {
                    /** 命令正则匹配 */
                    reg: '酒仙|井空|老猫|猫佬|羊总|猫哥',
                    /** 执行方法 */
                    fnc: 'pic1',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#xzcos$',
                    /** 执行方法 */
                    fnc: 'pic2',
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
        const isPrivate = this.e.isPrivate;
        /* 
        参数名称	参数类型	是否必填	备注内容
screen	int	否	默认是3。1是横屏，2是视频，3是竖屏
format	int	否	类型，竖屏以及横屏时：(1：美女，2：动漫，3：风景，4：游戏，5：明星，6：机械，7：动物，8：文字，9：城市，10：视觉，11：物语，：12：情感，13：设计，14：男人)，视频时：(1：动漫，2：网红，3：游戏，4：热门，5：风景，6：其他，7：热舞，8：娱乐，9：影视，10：动物)。默认1
page	int	否	页码，默认是1，可以翻页
limit	int	否	每页显示数量，默认24个。
type	String	否	返回输出格式，默认json可选text/url。text为SQ类型词库，url为纯url输出
        */
        const url = `https://api.lolimi.cn/API/loveanimer/?screen=&format=1&page=1&limit=24`
        let imgInfo = await fetch(url).then(res => res.json()).catch((err) => console.log(err))
        if (imgInfo.code === 1) {
            let data = imgInfo.data
            let msgs = []
            let forwarder = {
                nickname: this.e.sender.card || this.e.user_id,
                user_id: this.e.user_id,
            }
            if (Array.isArray(data)) {
                let msg
                data.forEach(async el1 => {
                    /* {"width": 1440,
                        "height": 3040,
                        "size": 327020,
                        "url": "",
                        "tag": ""}, */
                    // msg = [segment.image(e.url), e.tag]

                    msg = segment.image(el1.url)
                    if (isPrivate) {
                        await this.e.reply(msg, false, {
                            recallMsg: false,
                        });
                        sleep(600)
                    } else {
                        msgs.push({
                            ...forwarder,
                            message: msg,
                        })
                    }
                });
            }
            if (isPrivate) {
                return;
            }
            let msgList = await Bot.makeForwardMsg(msgs)
            const res = await this.e.reply(msgList, false, {
                recallMsg: -1,
            });
            if (!res) {

                console.log('Error ObtainImage pic() 合并消息消息发送出错啦！')
                let l = msgs.length > 3 ? 3 : msgs.length
                for (let i = 0; i < l; i++) {
                    await this.e.reply(msgs[i].message, false, {
                        recallMsg: false,
                    });
                    sleep(3000)
                }
                // await this.e.reply(`被风控啦，发不出来,给你${l}张吧！！！`)

            }

        } else {
            return !1
        }

    }
    async pic1(e) {
        const url1 = `https://api.lolimi.cn/API/meinv/api.php?type=text`
        let imgUrl1 = await fetch(url1).then(res => res.text()).catch(err => console.error(err));
        e.reply(segment.image(imgUrl1));
    }
    async pic2(e) {
        const url1 = `https://api.lolimi.cn/API/cosplay/api.php?type=all`
        let imgInfo = await fetch(url1).then(res => res.json()).catch(err => console.error(err));

        if (imgInfo.code === 1) {
            let data = imgInfo.data.data
            let msgs = []
            let forwarder = {
                nickname: this.e.sender.card || this.e.user_id,
                user_id: this.e.user_id,
            }
            if (Array.isArray(data)) {
                let msg
                for (let i = 0; i < data.length; i++) {
                    msg = segment.image(data[i])
                    if (isPrivate) {
                        await this.e.reply(msg, false, {
                            recallMsg: false,
                        });
                        sleep(600)
                    } else {
                        msgs.push({
                            ...forwarder,
                            message: msg,
                        })
                    }
                }
            }
            if (isPrivate) {
                return;
            }
            msgs = [`${imgInfo.data.Title}`, ...msgs]
            let msgList = await Bot.makeForwardMsg(msgs)
            const res = await this.e.reply(msgList, false, {
                recallMsg: -1,
            });
            if (!res) {

                console.log('Error ObtainImage pic2() 合并消息消息发送出错啦！')
                let l = msgs.length > 4 ? 4 : msgs.length
                // await this.e.reply(`被风控啦，发不出来,给你${l}张吧！！！`)
                for (let i = 0; i < l; i++) {
                    await this.e.reply(msgs[i].message, false, {
                        recallMsg: false,
                    });
                    sleep(3000)
                }


            }

        } else {
            return !1
        }
    }




}
