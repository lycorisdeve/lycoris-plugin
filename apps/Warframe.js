import fetch from "node-fetch";
import fs from 'node:fs'
import yaml from 'yaml'
import Config from '../components/Config.js'
import moment from "moment";
import puppeteer from 'puppeteer'
import { pluginRootPath } from "../components/lib/Path.js";
import plugin from '../../../lib/plugins/plugin.js'

/* 
Api地址建议自己搭建，地址：https://github.com/WsureWarframe/warframe-info-api.git
Api:http://nymph.rbq.life:3000/
created by lycoris!
*/


const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
];
// 配置管理
const config = Config.getConfig('warframe');
let isNationalService = config.isNationalService;
if (typeof isNationalService !== 'boolean') {
    logger.error('配置错误，已默认设置为国服');
    isNationalService = true;
}

const BASE_URL = isNationalService ? 'https://api.null00.com/world/ZHCN/' : 'http://nymph.rbq.life:3000/';

// 工具函数
const formatTime = {
    // 格式化完整时间
    full: (time) => {
        const date = new Date(time);
        const pad = num => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },

    // 格式化时分秒
    hms: (time) => {
        const date = new Date(time);
        const pad = num => String(num).padStart(2, '0');
        return `${pad(date.getHours())}时${pad(date.getMinutes())}分${pad(date.getSeconds())}秒`;
    },

    // 计算时间差
    diff: (timeDifference) => {
        const hours = Math.floor(timeDifference / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
        const pad = num => String(num).padStart(2, '0');
        return `${pad(hours)}时${pad(minutes)}分${pad(seconds)}秒`;
    },

    // 计算天时分秒
    dhms: (timeDifference) => {
        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
        const pad = num => String(num).padStart(2, '0');
        return `${pad(days)}天${pad(hours)}时${pad(minutes)}分${pad(seconds)}秒`;
    }
};

// API请求工具
const api = {
    async get(endpoint) {
        try {
            const response = await fetch(BASE_URL + endpoint, {
                timeout: 10000,
                headers: {
                    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error(`API请求错误: ${error.message}`);
            throw error;
        }
    },

    async getText(endpoint) {
        try {
            const response = await fetch(BASE_URL + endpoint, {
                timeout: 10000,
                headers: {
                    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
                }
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            logger.error(`API请求错误: ${error.message}`);
            throw error;
        }
    }
};

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
                reg: '#wf赛特斯(.*)|wf地球平原|平原时间|赛特斯时间|地球平原', //匹配消息正则,命令正则
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

            fs.writeFileSync(cfgPath, yaml.stringify(config), 'utf-8')
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
            fs.writeFileSync(cfgPath, yaml.stringify(config), 'utf-8')
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
    // 警报信息处理
    async getAlerts(e) {
        try {
            if (isNationalService) {
                const data = await api.get("alerts");
                let alertsMsg = "         警报        \n==================";
                
                if (!data?.alerts || data.alerts.length === 0) {
                    await e.reply(alertsMsg + "\n当前没有警报任务\n==================");
                    return;
                }
                
                for (const alert of data.alerts) {
                    const activationTime = moment.unix(alert.activation).format("YYYY-MM-DD HH:mm:ss");
                    const expiryTime = moment.unix(alert.expiry).format("YYYY-MM-DD HH:mm:ss");
                    const remainingTime = alert.expiry * 1000 - Date.now();
                    
                    alertsMsg += `\n${alert.location}\n` +
                        `\n${alert.missionType}丨${alert.faction}（${alert.minEnemyLevel} ~ ${alert.maxEnemyLevel}）\n` +
                        `\n剩余时间丨${formatTime.diff(remainingTime)}\n` +
                        `\n奖励丨星币 * ${alert.credits}`;
                    
                    if (alert.rewards?.length) {
                        for (const reward of alert.rewards) {
                            alertsMsg += `\n\t${reward.item} * ${reward.itemCount}`;
                        }
                    }
                    alertsMsg += "\n==================";
                }
                
                await e.reply(alertsMsg);
            } else {
                const data = await api.getText("wf/robot/alerts");
                await e.reply("         警报        \n==================\n" + data + "\n==================");
            }
        } catch (error) {
            logger.error(`警报信息获取失败: ${error.message}`);
            await e.reply("警报信息获取失败，请稍后重试");
        }
    }

    // 新闻处理
    async getNews(e) {
        try {
            if (isNationalService) {
                const data = await api.get("news");
                let newsMsg = "        飞船新闻       \n==================";
                
                if (!data?.news || data.news.length === 0) {
                    await e.reply(newsMsg + "\n当前没有新闻\n==================");
                    return;
                }

                // 按日期降序排序
                const sortedNews = data.news.sort((a, b) => b.date - a.date);
                
                // 只显示最近的10条新闻
                const recentNews = sortedNews.slice(0, 10);
                
                for (const news of recentNews) {
                    const newsTime = moment.unix(news.date).format("YYYY-MM-DD HH:mm:ss");
                    newsMsg += `\n${news.defaultMessages}\n` +
                        `\n时间丨${newsTime}\n` +
                        `\n链接丨${news.prop}\n` +
                        "\n==================";
                }

                await e.reply(newsMsg);
            } else {
                const data = await api.get("wf/detail/news");
                let newsMsg = "        飞船新闻       \n==================";
                
                for (const news of data) {
                    const newsTime = new Date(news.date);
                    newsMsg += `\n${news.message}\n` +
                        `\n时间丨${formatTime.full(newsTime)}\n` +
                        `\n链接丨${news.link}\n` +
                        "\n==================";
                }

                await e.reply(newsMsg);
            }
        } catch (error) {
            logger.error(`新闻获取失败: ${error.message}`);
            await e.reply("新闻获取失败，请稍后重试");
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
    // 地球赏金任务
    async getEarthBounty(e) {
        try {
            if (isNationalService) {
                const data = await api.get("alerts");
                const bounties = data?.bountys?.find(b => b.tag === "赛特斯");
                let msg = "         地球赏金        \n==================\n";
                
                if (!bounties) {
                    await e.reply(msg + "当前没有赏金任务\n==================");
                    return;
                }

                const expiryTime = bounties.expiry * 1000;
                const remainingTime = expiryTime - Date.now();
                
                msg += `剩余时间：${formatTime.diff(remainingTime)}\n`;
                
                for (const job of bounties.jobs) {
                    if (job.jobType === "未知") continue;
                    
                    msg += `\n${job.jobType}\n` +
                          `等级：${job.minEnemyLevel} ~ ${job.maxEnemyLevel}\n` +
                          `段位要求：${job.masteryReq}\n` +
                          `奖励：${job.rewards.replace(/<br \/>/g, "、")}\n` +
                          "==================\n";
                }
                
                msg += "\t\t\t\t\t\t奖励列表的遗物不一定是正确的";
                await e.reply(msg);
            } else {
                const data = await api.getText("wf/robot/Ostrons");
                let msg = "         地球赏金        \n==================\n" + 
                         data + "\n==================\n\t\t\t\t\t\t奖励列表的遗物不一定是正确的";
                await e.reply(msg);
            }
        } catch (error) {
            logger.error(`地球赏金信息获取失败: ${error.message}`);
            await e.reply("地球赏金信息获取失败，请稍后重试");
        }
    }

    // 金星赏金任务
    async getSolarisBounty(e) {
        try {
            if (isNationalService) {
                const data = await api.get("alerts");
                const bounties = data?.bountys?.find(b => b.tag === "索拉里斯");
                let msg = "         金星赏金        \n==================\n";
                
                if (!bounties) {
                    await e.reply(msg + "当前没有赏金任务\n==================");
                    return;
                }

                const expiryTime = bounties.expiry * 1000;
                const remainingTime = expiryTime - Date.now();
                
                msg += `剩余时间：${formatTime.diff(remainingTime)}\n`;
                
                for (const job of bounties.jobs) {
                    if (job.jobType === "未知") continue;
                    
                    msg += `\n${job.jobType}\n` +
                          `等级：${job.minEnemyLevel} ~ ${job.maxEnemyLevel}\n` +
                          `段位要求：${job.masteryReq}\n` +
                          `奖励：${job.rewards.replace(/<br \/>/g, "、")}\n` +
                          "==================\n";
                }
                
                msg += "\t\t\t\t\t\t奖励列表的遗物不一定是正确的";
                await e.reply(msg);
            } else {
                const data = await api.getText("wf/robot/Solaris");
                let msg = "         金星赏金        \n==================\n" + 
                         data + "\n==================\n\t\t\t\t\t\t奖励列表的遗物不一定是正确的";
                await e.reply(msg);
            }
        } catch (error) {
            logger.error(`金星赏金信息获取失败: ${error.message}`);
            await e.reply("金星赏金信息获取失败，请稍后重试");
        }
    }

    // 火卫二赏金任务
    async getEntratiSyndicateBounty(e) {
        try {
            if (isNationalService) {
                const data = await api.get("alerts");
                const bounties = data?.bountys?.find(b => b.tag === "EntratiSyndicate");
                let msg = "         火卫二赏金        \n==================\n";
                
                if (!bounties) {
                    await e.reply(msg + "当前没有赏金任务\n==================");
                    return;
                }

                const expiryTime = bounties.expiry * 1000;
                const remainingTime = expiryTime - Date.now();
                
                msg += `剩余时间：${formatTime.diff(remainingTime)}\n`;
                
                for (const job of bounties.jobs) {
                    if (job.jobType === "未知") continue;
                    
                    msg += `\n${job.jobType}\n` +
                          `等级：${job.minEnemyLevel} ~ ${job.maxEnemyLevel}\n` +
                          `段位要求：${job.masteryReq}\n` +
                          `奖励：${job.rewards}\n` +
                          "==================\n";
                }
                
                msg += "\t\t\t\t\t\t奖励列表的遗物不一定是正确的";
                await e.reply(msg);
            } else {
                const data = await api.getText("wf/robot/EntratiSyndicate");
                let msg = "         火卫二赏金        \n==================\n" + 
                         data + "\n==================\n\t\t\t\t\t\t奖励列表的遗物不一定是正确的";
                await e.reply(msg);
            }
        } catch (error) {
            logger.error(`火卫二赏金信息获取失败: ${error.message}`);
            await e.reply("火卫二赏金信息获取失败，请稍后重试");
        }
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


// 已移除旧的API获取函数，使用api对象替代


