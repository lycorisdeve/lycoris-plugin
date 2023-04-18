import fetch from "node-fetch";
import fs from 'node:fs'
import plugin from '../../../lib/plugins/plugin.js'

/* 
Api地址建议自己搭建，地址：https://github.com/WsureWarframe/warframe-info-api.git
Api:http://nymph.rbq.life:3000/
created by lycoris!
*/
const url = 'http://nymph.rbq.life:3000/'

let user_agent = [
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

//1.定义命令规则
export class warframe extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'warframe',
            /** 功能描述 */
            dsc: 'warframe',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级,数字越小等级越高 */
            priority: 2000,
            rule: [{
                /** 命令正则匹配 */
                reg: '#wf帮助|wfhelp|wf菜单', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'menu'
            }, {
                /** 命令正则匹配 */
                reg: '#wf警报信息|警报信息|#wf警报', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceAlerts'
            }, {
                /** 命令正则匹配 */
                reg: '#wf新闻(.*)', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceNews'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf赛特斯(.*)|wf地球平原|wf平原时间', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceCetus'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf地球时间|#地球外景时间', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceEarth'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf索拉里斯(.*)|#wf金星平原|wf金星平原', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceSolaris'
            },
            {
                /** 命令正则匹配 */
                reg: '#地球赏金', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getEarthBounty'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf金星赏金(.*)|wf金星平原赏金|#金星赏金', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getSolarisBounty'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf火卫二赏金|wf火卫二平原赏金|#火卫二赏金', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getEntratiSyndicateBounty'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf裂隙(.*)|wf裂隙信息', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceFissures'
            },
            {
                /** 命令正则匹配 */
                reg: 'wf奸商(.*)', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceTrader'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf突击(.*)|wf突击信息|wf今日突击', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceSortie'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf每日优惠(.*)', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceDailyDeals'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf入侵(.*)', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceInvasions'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf事件(.*)|热美亚|尸鬼', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceEvents'
            },
            {
                /** 命令正则匹配 */
                reg: '#wf电波(.*)|wf电波|wf电波任务', //匹配消息正则,命令正则
                /** 执行方法 */
                fnc: 'getInternationalServiceNightwave'
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
            }
            ]

        })
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
        let msg = "命令头：wfi \n" +
            "\n参数： \n" +
            "\n如:wfi菜单、wfi警报 \n" +
            "\n================== \n" +
            "\n  警 报  丨入侵丨     赏 金     丨  突击  丨 裂隙 \n" +
            "\n电波/章节丨地球丨赛特斯/地球平原丨索拉里斯/金星平原 \n" +
            "\n  奸 商  丨事件丨     新 闻     丨    每日优惠    "
        e.reply(msg)
    }
    // 警报
    async getInternationalServiceAlerts(e) {
        let data = await getTextData("wf/robot/alerts")
        let temp_alerts = "         警报        \n==================\n"
        /*   for (let alert in data) {
              temp_alerts += "\n" + data[alert].location + "\n" +
                  "\n" + data[alert].missionType + "丨" + data[alert].faction + "（" + data[alert].minEnemyLevel + " ~ " + data[alert].maxEnemyLevel + "）" + "\n" +
                  "\n奖励丨星币 * " + data[alert].credits
              let temp_reward = ""
  
              for (let alert_reward in data[alert].rewards) {
                  temp_reward += "\n\t" + data[alert].rewards[alert_reward].item + "*" + data[alert].rewards[alert_reward].itemCount
                  temp_alerts += temp_reward + "\n=================="
              }
          } */
        temp_alerts += data + "\n=================="
        e.reply(temp_alerts)


    }

    //  新闻
    async getInternationalServiceNews(e) {
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


    //  赛特斯
    async getInternationalServiceCetus(e) {
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

    // 地球
    async getInternationalServiceEarth(e) {
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


    // 索拉里斯
    async getInternationalServiceSolaris(e) {
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
    async getInternationalServiceFissures(e) {
        let data = await getTextData("wf/robot/fissures")
        let temp_fissures = "         裂隙        \n" + data

        e.reply(temp_fissures)
    }


    // 奸商
    async getInternationalServiceTrader(e) {
        let data = await getTextData("wf/robot/voidTrader")
        let msg = "         奸商        \n==================\n" + data
        e.reply(msg)
    }


    // 突击
    async getInternationalServiceSortie(e) {
        let data = await getTextData("wf/robot/sortie")
        let temp_sortie = "         今日突击        \n==================\n" + data
        e.reply(temp_sortie)
    }


    // 每日优惠
    async getInternationalServiceDailyDeals(e) {
        let data = await getTextData("wf/robot/dailyDeals")
        let temp_daily_deals = "         达尔沃优惠        \n==================\n" + data
        e.reply(temp_daily_deals)
    }

    // 入侵
    async getInternationalServiceInvasions(e) {
        let data = await getTextData("wf/robot/invasions")
        let temp_invasions = "         入侵信息        \n==================\n" + data
        e.reply(temp_invasions)

    }


    // 事件
    async getInternationalServiceEvents(e) {
        let data = await getTextData("wf/robot/events")
        let temp_event = "         事件        \n" + data
        e.reply(temp_event)
    }


    // 电波
    async getInternationalServiceNightwave(e) {
        let data = await getTextData("wf/robot/nightwave")
        let temp_season = "         电波任务        \n" + data

        e.reply(temp_season)
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
        headers: {
            "User-Agent": user_agent[Math.floor((Math.random() * user_agent.length))]
        }
    })

    return await data1.text()

}



