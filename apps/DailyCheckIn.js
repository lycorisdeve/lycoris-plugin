import fetch from 'node-fetch'
import { pluginName } from '../components/lib/Path.js';
import puppeteer from "../../../lib/puppeteer/puppeteer.js";


let _path = process.cwd()

export class dailycheckin extends plugin {
    constructor() {
        super({
            name: '彼岸花签到',
            dsc: '彼岸花每日签到功能',
            event: 'message',
            priority: 2000,
            rule: [{
                reg: "签到|打卡|daka|冒泡",
                fnc: 'checkIn'
            }]
        })
    }

    async checkIn(e) {

        let sign_group_user = {
            user_qq: null,
            check_in_days: 0,
            check_in_last: "0000-00-00",
            check_in_time: "0000-00-00",
            favorability: 0,
            mora: 0,
            primogems: 0,

        }
        let today_check_in = {
            td_favorability: 0.0,
            td_mora: 0,
            td_primogems: 0

        }
        let mooto = ''

        sign_group_user.user_qq = e.user_id
        let mySignInInfo = await redis.get("Lycoris:checkIn:" + sign_group_user.user_qq)
        if (mySignInInfo == null) {
            sign_group_user.check_in_time = await this.formatNowTime()
            sign_group_user.favorability = 0
            let t_money = await this.getCheckInInformation(sign_group_user.favorability)
            if (t_money) {
                // 设置总好感度、摩拉、原石
                sign_group_user.check_in_days = 1
                sign_group_user.check_in_last = await this.formatNowTime()
                sign_group_user.favorability = t_money.favorability
                sign_group_user.mora = t_money.mora
                sign_group_user.primogems = t_money.primogems
                sign_group_user.primogems = 7
                // 设置今日签到信息
                today_check_in.td_favorability = t_money.favorability
                today_check_in.td_mora = t_money.mora
                today_check_in.td_primogems = t_money.primogems

                let tci = JSON.stringify(today_check_in)
                let sgu = JSON.stringify(sign_group_user)
                let td_ci_date = await this.formatNowDate()

                await redis.set("Lycoris:td_ci:" + td_ci_date + ':' + sign_group_user.user_qq, tci, { EX: 3600 * 24 })
                await redis.set("Lycoris:checkIn:" + sign_group_user.user_qq, sgu, { EX: 3600 * 24 * 90 })
                mySignInInfo = await redis.get("Lycoris:checkIn:" + sign_group_user.user_qq)

            } else {
                return e.reply("签到出错！！！")
            }

        } else {
            let td_ci_date = await this.formatNowDate()
            let last_ci_info_json = await redis.get("Lycoris:td_ci:" + td_ci_date + ':' + sign_group_user.user_qq)
            let last_ci_info = JSON.parse(last_ci_info_json)

            if (last_ci_info) {
                today_check_in = last_ci_info
                e.reply("你今天已经签到过了，无需重复签到！", true);
            } else {
                // 查询上次数据+修改今天数据
                sign_group_user.check_in_time = await this.formatNowTime()
                let tmJson = JSON.parse(mySignInInfo)
                let t_money = await this.getCheckInInformation(tmJson.favorability)

                sign_group_user.favorability = parseFloat(tmJson.favorability) + parseFloat(t_money.favorability)
                sign_group_user.check_in_days = parseFloat(tmJson.check_in_days) + 1
                sign_group_user.check_in_last = tmJson.check_in_time
                sign_group_user.mora = parseInt(tmJson.mora) + parseInt(t_money.mora)
                sign_group_user.primogems = parseInt(tmJson.primogems) + parseInt(t_money.primogems)
                // 设置今日签到信息

                today_check_in.td_favorability = t_money.favorability
                today_check_in.td_mora = t_money.mora
                today_check_in.td_primogems = t_money.primogems

                let tci = JSON.stringify(today_check_in)
                let sgu = JSON.stringify(sign_group_user)
                let td_ci_date = await this.formatNowDate()

                await redis.set("Lycoris:td_ci:" + td_ci_date + ':' + sign_group_user.user_qq, tci, { EX: 3600 * 24 })
                await redis.set("Lycoris:checkIn:" + sign_group_user.user_qq, sgu, { EX: 3600 * 24 * 90 })
                mySignInInfo = await redis.get("Lycoris:checkIn:" + sign_group_user.user_qq)

            }
        }

        let checkInInformation = JSON.parse(mySignInInfo)

        // let qqInfoJson = await fetch("http://xiaobai.klizi.cn/API/qqgn/qq.php?qq=" + e.user_id)
        // 一言
        mooto = await fetch("https://v1.hitokoto.cn/?encode=text").then(res => res.text()).catch((err) => console.error(err))
        // let bgApi = "https://xiaobai.klizi.cn/API/img/game.php"
        // let background = await fetch(bgApi).then(res => res.text()).catch((err) => console.error(err))
        let last_sign_in = checkInInformation.check_in_last ? checkInInformation.check_in_last.substr(0, 10) : '0000-00-00'

        // let qqInfo = await qqInfoJson.json()
        let qqAvatar = `https://api.qqsuu.cn/api/dm-qt?qq=${e.user_id}`
        let data = {
            tplFile: `./plugins/${pluginName}/resources/html/signin/signin.html`,
            dz: _path,
            userInfo: checkInInformation,
            qqAvatar: qqAvatar,
            tdInfo: today_check_in,
            mooto: mooto,
            last_sign_in: last_sign_in,
            nickname: e.nickname
            // bg: background
        }
        let img = await puppeteer.screenshot("123", {
            ...data,
        });

        await e.reply(img, false, { at: true })

    }

    async getCheckInInformation(e) {
        let info = {
            favorability: 0,
            mora: 0,
            primogems: 0
        }
        info.favorability = (Math.random() * 10).toFixed(2)
        info.mora = Math.floor(Math.random() * 1000 * e + 1000)
        info.primogems = Math.floor(Math.random() * 100 * e + 60)
        return info
    }

    async formatNowTime() {
        var myDate = new Date();	//创建Date对象
        var Y = myDate.getFullYear();   //获取当前完整年份
        var M = myDate.getMonth() + 1;  //获取当前月份
        var D = myDate.getDate();   //获取当前日1-31
        var H = myDate.getHours();  //获取当前小时
        var i = myDate.getMinutes();    //获取当前分钟
        var s = myDate.getSeconds();    //获取当前秒数
        // 月份不足10补0
        if (M < 10) {
            M = '0' + M;
        }
        // 日不足10补0
        if (D < 10) {
            D = '0' + D;
        }
        // 小时不足10补0
        if (H < 10) {
            H = '0' + H;
        }
        // 分钟不足10补0
        if (i < 10) {
            i = '0' + i;
        }
        // 秒数不足10补0
        if (s < 10) {
            s = '0' + s;
        }
        // 拼接日期分隔符根据自己的需要来修改
        return Y + '-' + M + '-' + D + ' ' + H + ':' + i + ':' + s;
    }
    async formatNowDate() {
        var myDate = new Date();	//创建Date对象
        var Y = myDate.getFullYear();   //获取当前完整年份
        var M = myDate.getMonth() + 1;  //获取当前月份
        var D = myDate.getDate();   //获取当前日1-31

        // 月份不足10补0
        if (M < 10) {
            M = '0' + M;
        }
        // 日不足10补0
        if (D < 10) {
            D = '0' + D;
        }
        // 拼接日期分隔符根据自己的需要来修改
        return Y + '-' + M + '-' + D;
    }

}