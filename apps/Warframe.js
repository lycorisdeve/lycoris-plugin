import fetch from "node-fetch";
import fs from 'node:fs'
import yaml from 'yaml'
import Config from '../model/config.js'
import moment from "moment";
import puppeteer from 'puppeteer'
import { pluginRootPath } from "../components/lib/Path.js";
import plugin from '../../../lib/plugins/plugin.js'

/* 
Api地址建议自己搭建，地址：https://github.com/WsureWarframe/warframe-info-api.git
Api:http://nymph.rbq.life:3000/
created by lycoris!
*/


const user_agent = [
    "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50",
    "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; InfoPath.3; rv:11.0) like Gecko",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
    "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)",
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:2.0.1) Gecko/20100101 Firefox/4.0.1",
    "Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1",
    "Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; en) Presto/2.8.131 Version/11.11",
    "Opera/9.80 (Windows NT 6.1; U; en) Presto/2.8.131 Version/11.11",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_0) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Maxthon 2.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; TencentTraveler 4.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; The World)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0; SE 2.X MetaSr 1.0; SE 2.X MetaSr 1.0; .NET CLR 2.0.50727; SE 2.X MetaSr 1.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; 360SE)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Avant Browser)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1)",
    "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
    "Mozilla/5.0 (iPod; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
    "Mozilla/5.0 (iPad; U; CPU OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
    "Mozilla/5.0 (Linux; U; Android 2.3.7; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
    "MQQBrowser/26 Mozilla/5.0 (Linux; U; Android 2.3.7; zh-cn; MB200 Build/GRJ22; CyanogenMod-7) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
    "Opera/9.80 (Android 2.3.4; Linux; Opera Mobi/build-1107180945; U; en-GB) Presto/2.8.149 Version/11.10",
    "Mozilla/5.0 (Linux; U; Android 3.0; en-us; Xoom Build/HRI39) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13",
    "Mozilla/5.0 (BlackBerry; U; BlackBerry 9800; en) AppleWebKit/534.1+ (KHTML, like Gecko) Version/6.0.0.337 Mobile Safari/534.1+",
    "Mozilla/5.0 (hp-tablet; Linux; hpwOS/3.0.0; U; en-US) AppleWebKit/534.6 (KHTML, like Gecko) wOSBrowser/233.70 Safari/534.6 TouchPad/1.0",
    "Mozilla/5.0 (SymbianOS/9.4; Series60/5.0 NokiaN97-1/20.0.019; Profile/MIDP-2.1 Configuration/CLDC-1.1) AppleWebKit/525 (KHTML, like Gecko) BrowserNG/7.1.18124",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0; HTC; Titan)",
    "UCWEB7.0.2.37/28/999",
    "NOKIA5700/ UCWEB7.0.2.37/28/999",
    "Openwave/ UCWEB7.0.2.37/28/999",
    "Mozilla/4.0 (compatible; MSIE 6.0; ) Opera/UCWEB7.0.2.37/28/999",
    //  iPhone 6：
    "Mozilla/6.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/8.0 Mobile/10A5376e Safari/8536.25",
]
const config = Config.getConfig('warframe')
let isNationalService = config.isNationalService
if (typeof isNationalService !== 'boolean') {
    logger.error('配置错误，已默认设置为国服')
    isNationalService = true
}
let url
if (isNationalService) {
    url = 'https://api.null00.com/world/ZHCN/'
} else {
    url = 'http://nymph.rbq.life:3000/'
}

//1.定义命令规则
export class warframe extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'warframe',
            /** 功能描述 */
            dsc: 'warframe信息查询',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级,数字越小等级越高 */
            priority: 2000,
            rule: [{
                /** 命令正则匹配 */
                reg: '#wf帮助|wfhelp|wf菜单|wf帮助', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'menu'
            }, {
                /** 命令正则匹配 */
                reg: '#wf警报信息|警报信息|#wf警报|wf警报', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getAlerts'
            }, {
                /** 命令正则匹配 */
                reg: '#wf新闻|wf新闻', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getNews'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf赛特斯(.*)|wf地球平原|wf平原时间|赛特斯时间|地球平原', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getCetus'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf地球时间|#地球外景时间|wf地球时间', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getEarth'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf索拉里斯(.*)|#wf金星平原|wf金星平原|金星平原', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getSolaris'
            },
            {
                /** 命令正则匹配 */
                    reg: '#wf赏金|wf赏金', //匹配消息正则,命令正则
                    /** 执行方法 */
                    fnc: 'getBounty'
                },
                {
                    /** 命令正则匹配 */
                    reg: '#地球赏金|地球赏金', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getEarthBounty'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf金星赏金|金星平原赏金|#金星赏金', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getSolarisBounty'
            },
            {
                /** 命令正则匹配 */
                reg: '火卫二赏金|火卫二平原赏金|#火卫二赏金', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getEntratiSyndicateBounty'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf裂隙|裂隙信息|裂缝信息', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getFissures'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf奸商', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getTrader'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf突击|突击信息|今日突击', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getSortie'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf每日优惠', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getDailyDeals'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf入侵|入侵信息', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInvasions'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf事件|热美亚|尸鬼', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getEvents'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf电波|电波信息|电波任务', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getNightwave'
            },
            {
                /** 命令正则匹配 */
                reg: '#wm(.*)', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getWMInfo'
            },
            {
                /** 命令正则匹配 */
                reg: '#rm(.*)', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getRMInfo'
            },
            {
                /** 命令正则匹配 */
                reg: '#wfwiki(.*)', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getWikiInfo'
                },
                {
                    /** 命令正则匹配 */
                    reg: '#切换为国服', //匹配消息正则,命令正则
                    /** 执行方法 */
                    fnc: 'changeToNational'
                },
                {
                    /** 命令正则匹配 */
                    reg: '#切换为国际服', //匹配消息正则,命令正则
                    /** 执行方法 */
                    fnc: 'changeToInternational'
                }, {
                    /** 命令正则匹配 */
                    reg: '#国服所有信息', //匹配消息正则,命令正则
                    /** 执行方法 */
                    fnc: 'getImg'
                }
            ]

        })
    }
    async getImg(e) {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto("https://ordis.null00.com/v1/");
        await page.setViewport({
            width: 1200,
            height: 800
        });
        await page.screenshot({
            path: 'resources/wf.png',
            fullPage: true
        });

        await browser.close();
        await e.reply([segment.image('resources/wf.png')])

        fs.unlink('resources/wf.png', () => { });

    }
    async changeToNational(e) {
        isNationalService = true
        config.isNationalService = true
        const cfgPath = `${pluginRootPath}/config/warframe.yaml`
        if (fs.existsSync(cfgPath)) {
            
            fs.writeFileSync(cfgPath,yaml.stringify(config),'utf-8' )
        } else {
            e.reply("切换出错")
            return
        }

    url = 'https://api.null00.com/world/ZHCN/'
        e.reply("切换成功，当前服务器为 国服")

    }
    async changeToInternational(e) {
        isNationalService = false
        config.isNationalService = false
        const cfgPath = `${pluginRootPath}/config/warframe.yaml`
        if (fs.existsSync(cfgPath)) {
            fs.writeFileSync(cfgPath,yaml.stringify(config),'utf-8')
        } else {
            e.reply("切换出错")
            return
        }
    url = 'http://nymph.rbq.life:3000/'

        e.reply("切换成功，当前服务器为 国际服")

    }
    async getWikiInfo(e) {
        let good = e.msg.replace(/wfwiki/g, "").trim()
        let data = await getTextData("wiki/robot/" + good)
        e.reply(data)

    }
    async getWMInfo(e) {

        let good = e.msg.replace(/wm/g, "").trim()
        let data = await getTextData("wm/robot/" + good)
        e.reply(data)

    }
    async getRMInfo(e) {
        let good = e.msg.replace(/rm/g, "").trim()
        let data = await getTextData("wm/robot/" + good)
        e.reply(data)

    }

    //  菜单
    async menu(e) {
        let msg = `命令头：wf
参数： 
如:wf菜单、wf警报
=================================================================
警       报:wf警报信息|警报信息|wf警报
新       闻:wf新闻
入       侵:wf入侵|入侵信息
赏       金:(国服)#wf赏金 | wf赏金 
            (国际服)#地球赏金  金星平原赏金/#金星赏金 
             火卫二赏金|火卫二平原赏金|#火卫二赏金
突       击:wf突击|突击信息|今日突击
裂       隙:wf裂隙|裂隙信息|裂缝信息
电       波:#wf电波|wf电波|wf电波任务
地       球:wf地球时间|#地球外景时间
地球平原时间:wf赛特斯|wf地球平原|wf平原时间|赛特斯时间|地球平原
金星平原时间:wf索拉里斯|wf金星平原|wf金星平原|金星平原
奸       商:wf奸商
事       件:wf事件|热美亚|尸鬼
每日优惠信息:wf每日优惠
W  M 市  场:#wm 紫卡
R  M 市  场:#rm 紫卡
WIKI 信  息:#wfwiki 绿陶
==================================================================
`
        e.reply(msg)
    }
    // 警报
    async getAlerts(e) {
        if (isNationalService) {
            let data = await getJsonData("alerts")
            let temp_alerts = "         警报        \n=================="
            for (let alert in data) {
                temp_alerts += "\n" + data[alert].location + "\n" +
                    "\n" + data[alert].missionType + "丨" + data[alert].faction + "（" + data[alert].minEnemyLevel + " ~ " + data[alert].maxEnemyLevel + "）" + "\n" +
                    "\n奖励丨星币 * " + data[alert].credits
                let temp_reward = ""

                for (let alert_reward in data[alert].rewards) {
                    temp_reward += "\n\t" + data[alert].rewards[alert_reward].item + "*" + data[alert].rewards[alert_reward].itemCount
                    temp_alerts += temp_reward + "\n=================="
                }
            }
            e.reply(temp_alerts)
        } else {
            let data = await getTextData("wf/robot/alerts")
            let temp_alerts = "         警报        \n==================\n"
            temp_alerts += data + "\n=================="
            e.reply(temp_alerts)
        }

    }

    //  新闻
    async getNews(e) {
        if (isNationalService) {
            let data = await getJsonData("news")
            let temp_news = "        飞船新闻       \n=================="
            for (let newIndex in data) {
                let nTime = new Date(moment.unix(data[newIndex].date).format("YYYY-MM-DD HH:mm:ss"))
                temp_news += "\n" + data[newIndex].defaultMessages + "\n" +
                    "\n时间丨" + await getFormatTime(nTime.getTime()) + " \n" +
                    "\n链接丨" + data[newIndex].prop + "\n" +
                    "\n=================="
            }

            e.reply(temp_news)

        } else {
            let data = await getJsonData("wf/detail/news")
            let temp_news = "        飞船新闻       \n=================="
            for (let newIndex in data) {
                let nTime = new Date(data[newIndex].date)
                temp_news += "\n" + data[newIndex].message + "\n" +
                    "\n时间丨" + await getFormatTime(nTime.getTime()) + " \n" +
                    "\n链接丨" + data[newIndex].link + "\n" +
                    "\n=================="
            }

            e.reply(temp_news)
        }

    }


    //  赛特斯
    async getCetus(e) {
        if (isNationalService) {
            let data = await getJsonData("cetus")
            let day = ''
            if (data.day) {
                day = '白天'
            } else { day = '黑夜' }
            let cTime = new Date(moment.unix(data.cetusTime).format("YYYY-MM-DD HH:mm:ss"))

            let diffTime = cTime.getTime() - Date.now()
            if (diffTime < 0) {
                e.reply("查询错误，请稍后重试！")
            } else {
                let temp_cetus = "        地球平原       \n==========================\n" +
                    "\n" + day + "剩余时间\t丨\t" + await calculationTimeDifference(diffTime) + "\n" +
                    "\n昼夜交替时间\t丨\t" + await getFormatHms(cTime.getTime()) + " \n" +
                    "\n==========================\n🔆 时间可能会有 1~2 分钟 误差 🌙"
                e.reply(temp_cetus)
            }
        } else {
            let data = await getJsonData("wf/detail/cetusCycle")
            let day = ''
            if (data.isDay) {
                day = '白天'
            } else { day = '黑夜' }
            let temp_cetus = "        地球平原       \n==========================\n" +
                "\n" + day + "剩余时间\t丨\t" + data.timeLeft + "\n" +
                "\n昼夜交替时间\t丨\t" + await getFormatHms(data.expiry) + " \n" +
                "\n==========================\n🔆 时间可能会有 1~2 分钟 误差 🌙"
            e.reply(temp_cetus)
        }


    }

    // 地球
    async getEarth(e) {
        if (isNationalService) {
            let data = await getJsonData("earth")
            let day = ''
            if (data.day) {
                day = '白天'
            } else { day = '黑夜' }
            let eTime = new Date(moment.unix(data.earthDate).format("YYYY-MM-DD HH:mm:ss"))
            let diffTime = eTime.getTime() - Date.now()
            let temp_earth = "         地球        \n======================\n" +
                "\n" + day + "剩余\t丨\t" + await calculationTimeDifference(diffTime) + "\n" +
                "\n交替将于\t丨\t" + await getFormatHms(eTime.getTime()) + "\n" +
                "\n======================\n🔆 地球每四小时循环时间 🌙"
            e.reply(temp_earth)
        } else {
            let data = await getJsonData("wf/detail/earthCycle")
            let day = ''
            if (data.isDay) {
                day = '白天'
            } else { day = '黑夜' }
            let temp_earth = "         地球        \n======================\n" +
                "\n" + day + "剩余\t丨\t" + data.timeLeft + "\n" +
                "\n交替将于\t丨\t" + await getFormatHms(data.expiry) + "\n" +
                "\n======================\n🔆 地球每四小时循环时间 🌙"
            e.reply(temp_earth)
        }

    }


    // 索拉里斯
    async getSolaris(e) {
        if (isNationalService) {
            let data = await getJsonData("solaris")
            let state = ''
            if (data.state == 2)
                state = '寒冷'
            else if (data.state in [4, 1])
                state = '极寒'
            else {
                state = '温暖'
            }
            let sTime = new Date(moment.unix(data.solarisExpiry).format("YYYY-MM-DD HH:mm:ss"))
            let diffTime = sTime.getTime() - Date.now()
            let msg = "       金星平原      \n==================\n" +
                "\n" + state + "\t丨\t" + await calculationTimeDifference(diffTime) + "\n" +
                "\n交替\t丨\t" + await getFormatHms(sTime.getTime()) + "\n" +
                "\n=================="
            e.reply(msg)
        } else {
            let data = await getJsonData("wf/detail/vallisCycle")
            let state = ''
            if (data.state == 'warm')
                state = '温暖'
            else if (data.state == 'cold')
                state = '寒冷'
            else {
                state = '极寒'
            }
            let msg = "       金星平原      \n==================\n" +
                "\n" + state + "\t丨\t" + data.timeLeft + "\n" +
                "\n将于\t丨\t" + data.shortString + "\n" +
                "\n交替\t丨\t" + await getFormatHms(data.expiry) + "\n" +
                "\n=================="
            e.reply(msg)
        }


    }
    // 赏金
    async getEarthBounty(e) {
        let data = await getTextData("wf/robot/Ostrons")
        let temp_bounty = "         地球赏金        \n==================\n" + data +
            "\n==================\n\t\t\t\t\t\t奖励列表的遗物不一定是正确的"
        e.reply(temp_bounty)
    }
    async getSolarisBounty(e) {
        let data = await getTextData("wf/robot/Solaris")
        let temp_bounty = "         金星赏金        \n==================\n" + data +
            "\n==================\n\t\t\t\t\t\t奖励列表的遗物不一定是正确的"
        e.reply(temp_bounty)
    }
    async getEntratiSyndicateBounty(e) {
        let data = await getTextData("wf/robot/EntratiSyndicate")
        let temp_bounty = "         火卫二赏金        \n==================\n" + data +
            "\n==================\n\t\t\t\t\t\t奖励列表的遗物不一定是正确的"
        e.reply(temp_bounty)
    }


    // 裂隙
    async getFissures(e) {
        if (isNationalService) {
            let data = await getJsonData("fissures")
            let temp_fissures = "         裂隙        \n"
            // let fTime = ''
            for (let fissure in data) {
                let fTime = new Date(moment.unix(data[fissure].expiry).format("YYYY-MM-DD HH:mm:ss"))
                let diffTime = fTime.getTime() - Date.now()
                temp_fissures += data[fissure].modifier + "\t丨\t" + data[fissure].missionType + "\t丨\t" + data[fissure].node + "\t丨\t" + await calculationTimeDifference(diffTime) + "\n"
            }

            e.reply(temp_fissures)
        } else {
            let data = await getTextData("wf/robot/fissures")
            let temp_fissures = "         裂隙        \n" + data

            e.reply(temp_fissures)
        }

    }


    // 奸商
    async getTrader(e) {
        if (isNationalService) {
            let data = await getJsonData("trader")
            let nowTime = Date.now()
            let jsTime = new Date(moment.unix(data.activationnew).format("YYYY-MM-DD HH:mm:ss"))
            let jsTime1 = new Date(moment.unix(data.expiry).format("YYYY-MM-DD HH:mm:ss"))
            let traderTime = ''
            if (nowTime < jsTime.getTime())
                traderTime = parseInt(jsTime.getTime() - nowTime - 86400)
            else
                traderTime = parseInt(jsTime1.getTime() - nowTime)
            let msg = "         奸商        \n==================\n" +
                "\n" + data.character + "\n" +
                "\n地点丨" + data.node + "\n" +
                "\n剩余丨" + await getFormatDhms(traderTime) + "\n" +
                "\n=================="
            e.reply(msg)
        } else {
            let data = await getTextData("wf/robot/voidTrader")
            let msg = "         奸商        \n==================\n" + data
            e.reply(msg)
        }

    }


    // 突击
    async getSortie(e) {
        if (isNationalService) {
            let data = await getJsonData("sortie")
            let sTime = new Date(moment.unix(data.expiry).format("YYYY-MM-DD HH:mm:ss"))
            let diffTime = sTime.getTime() - Date.now()
            let temp_sortie = "         突击        \n==================\n" +
                "\n" + data.boss + ":" + await calculationTimeDifference(diffTime) + "\n" +
                "\n" + data.faction
            for (let variants in data.variants) {
                temp_sortie += "\n\t" + data.variants[variants].missionType + "\t丨\t" + data.variants[variants].node + "\t丨\t" + data.variants[variants].modifierType
            }
            e.reply(temp_sortie)
        } else {
            let data = await getTextData("wf/robot/sortie")
            let temp_sortie = "         今日突击        \n==================\n" + data
            e.reply(temp_sortie)
        }

    }


    // 每日优惠
    async getDailyDeals(e) {
        if (isNationalService) {
            let data = await getJsonData("deals")
            let temp_daily_deals = "         今日优惠        \n==================\n"
            for (let daily_deal in data) {
                let dTime = new Date(moment.unix(data[daily_deal].expiry).format("YYYY-MM-DD HH:mm:ss"))
                let diffTime = dTime.getTime() - Date.now()
                temp_daily_deals += data[daily_deal].item + "丨" + data[daily_deal].discount + "%折扣丨" + data[daily_deal].salePrice + "白金丨剩余 " + await calculationTimeDifference(diffTime) + "\n"
            }
            e.reply(temp_daily_deals)
        } else {
            let data = await getTextData("wf/robot/dailyDeals")
            let temp_daily_deals = "         达尔沃优惠        \n==================\n" + data
            e.reply(temp_daily_deals)
        }

    }

    // 入侵
    async getInvasions(e) {
        if (isNationalService) {
            let data = await getJsonData("invasions")
            let temp_invasions = "         入侵        \n==================\n"
            for (let invasion in data) {
                temp_invasions += data[invasion].node + "\t丨\t" + data[invasion].locTag + " \t丨\t"
                if (data[invasion].attacker.rewards) {
                    for (let attacker_reward in data[invasion].attacker.rewards)
                        temp_invasions += data[invasion].attacker.rewards[attacker_reward].item + "*" + data[invasion].attacker.rewards[attacker_reward].itemCount
                    temp_invasions += " / "
                }
                for (let defender_reward in data[invasion].defender.rewards) {
                    temp_invasions += data[invasion].defender.rewards[defender_reward].item + "*" + data[invasion].defender.rewards[defender_reward].itemCount + "\n"
                }

            }

            e.reply(temp_invasions)
        } else {
            let data = await getTextData("wf/robot/invasions")
            let temp_invasions = "         入侵信息        \n==================\n" + data
            e.reply(temp_invasions)

        }

    }


    // 事件
    async getEvents(e) {
        if (isNationalService) {
            let data = await getJsonData("events")
            let temp_event = "         事件        \n"
            for (let myEvent in data) {
                let dTime = new Date(moment.unix(data[myEvent].expiry).format("YYYY-MM-DD HH:mm:ss"))
                let diffTime = dTime.getTime() - Date.now()
                temp_event += "(" + data[myEvent].tag + ")距离结束时间丨" + await calculationTimeDifference(diffTime) + " | 已完成" + data[myEvent].healthPct + "\n"
            }
            e.reply(temp_event)
        } else {
            let data = await getTextData("wf/robot/events")
            let temp_event = "         事件        \n" + data
            e.reply(temp_event)
        }

    }


    // 电波
    async getNightwave(e) {
        if (isNationalService) {
            let data = await getJsonData("season")
            let temp_season = "         电波任务        \n"
            for (let challenge in data.challenges) {
                temp_season += data.challenges[challenge].cycle + "\t丨\t" + data.challenges[challenge].xp + "xp\t丨\t" + data.challenges[challenge].challenge + "\n"
            }
            e.reply(temp_season)
        } else {
            let data = await getTextData("wf/robot/nightwave")
            let temp_season = "         电波任务        \n" + data

            e.reply(temp_season)
        }

    }
    // 国服赏金
    async getBounty(e) {
        if (isNationalService) {
            let data = await getJsonData("bounty")
            let temp_bounty = "         赏金        \n=================="
            for (let bounty in data) {
                let sTime = new Date(moment.unix(data[bounty].expiry).format("YYYY-MM-DD HH:mm:ss"))
                let diffTime = sTime.getTime() - Date.now()
                temp_bounty += "\n" + data[bounty].tag + "   剩余时间：" + await calculationTimeDifference(diffTime)

                let temp_jobs = ""
                let bountyData = data[bounty].jobs
                for (let job in bountyData) {
                    temp_jobs += "\n\t" + bountyData[job].jobType +
                        "\n\t\t奖励：" + bountyData[job].rewards.replaceAll('<br />', '、')
                }
                temp_bounty += temp_jobs + "\n==================\n\t\t\t\t\t\t奖励列表的遗物不一定是正确的"
            }
            e.reply(temp_bounty)
        } else {
            e.reply('国际服赏金任务，请发送如 #火卫二赏金，详情请查看帮助！！！')
        }

    }








}


//  格式化时间
async function getFormatTime(time) {
    var myDate = new Date(time);	//创建Date对象
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
// 年月日
async function getFormatHms(time) {
    var myDate = new Date(time);	//创建Date对象
    var H = myDate.getHours();  //获取当前小时
    var i = myDate.getMinutes();    //获取当前分钟
    var s = myDate.getSeconds();    //获取当前秒数

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
    return H + '时' + i + '分' + s + '秒';

}


//  API 获取 Json 数据
async function getJsonData(url_arg) {

    let api_url = url + url_arg

    let data1 = await fetch(api_url, {
        timeout: 10000 ,// 设置5秒超时时间
        headers: {
            "User-Agent": user_agent[Math.floor((Math.random() * user_agent.length))]
        }
    })

    return await data1.json()

}
//  API 获取 Json 数据
async function getTextData(url_arg) {

    let api_url = url + url_arg

    let data1 = await fetch(api_url, {
        timeout: 10000 ,// 设置5秒超时时间
        headers: {
            "User-Agent": user_agent[Math.floor((Math.random() * user_agent.length))]
        }
    })

    return await data1.text()

}

async function calculationTimeDifference(timeDifference) {
    let hours = Math.floor(timeDifference / (1000 * 60 * 60));
    let minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    hours = hours < 10 ? '0' + hours : hours
    minutes = minutes < 10 ? '0' + minutes : minutes
    seconds = seconds < 10 ? '0' + seconds : seconds
    return hours + "时" + minutes + "分" + seconds + "秒"
}
async function getFormatDhms(timeDifference) {
    let days = Math.floor((timeDifference / (1000 * 60 * 60 * 24)))
    let hours = Math.floor(timeDifference / (1000 * 60 * 60) % 24);
    let minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    days = days < 10 ? '0' + days : days
    hours = hours < 10 ? '0' + hours : hours
    minutes = minutes < 10 ? '0' + minutes : minutes
    seconds = seconds < 10 ? '0' + seconds : seconds

    return days + "天" + hours + "时" + minutes + "分" + seconds + "秒"
}


