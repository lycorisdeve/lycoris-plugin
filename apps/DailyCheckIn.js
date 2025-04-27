import fetch from 'node-fetch'
import { pluginName } from '../components/lib/Path.js';
import puppeteer from "../../../lib/puppeteer/puppeteer.js";

// 常量配置
const REDIS_KEY_PREFIX = 'Lycoris:';
const CHECK_IN_KEY = `${REDIS_KEY_PREFIX}checkIn:`;
const TODAY_CHECK_IN_KEY = `${REDIS_KEY_PREFIX}td_ci:`;
const REDIS_EXPIRY = {
    DAILY: 3600 * 24,
    QUARTERLY: 3600 * 24 * 90
};
const API_CONFIG = {
    MOTTO: 'https://v1.hitokoto.cn/?encode=text',
    AVATAR: 'https://api.qqsuu.cn/api/dm-qt?qq=',
    IMG: 'http://api.yimian.xyz/img?type=moe',
    IMG_BAK: 'https://api.lolicon.app/setu/v2?size=regular&r18=0'
};

// 添加本地图片相关配置
const LOCAL_IMG_CONFIG = {
    SAVE_DIR: './plugins/lycoris-plugin/resources/backgrounds',
    MAX_IMAGES: 10,
    UPDATE_INTERVAL: 24 * 60 * 60 * 1000, // 24小时
};

// 工作目录
const _path = process.cwd();

export class DailyCheckIn extends plugin {
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
        });
    }

    /**
     * 用户签到主函数
     * @param {Object} e - 消息事件对象
     */
    async checkIn(e) {
        try {
            // 初始化用户数据
            const userQQ = e.user_id;
            const todayDate = await this.formatNowDate();

            // 获取用户签到信息
            let { signData, todayCheckIn, isFirstTime, alreadyCheckedIn } =
                await this.getUserCheckInStatus(userQQ, todayDate);

            // 如果今天已经签到过了
            if (alreadyCheckedIn) {
                await e.reply("你今天已经签到过了，无需重复签到！", true);
            }
            // 如果是首次签到或今天未签到
            else if (isFirstTime || !alreadyCheckedIn) {
                // 处理签到逻辑并获取更新后的数据
                const updatedData = await this.processCheckIn(signData, todayCheckIn, isFirstTime);
                signData = updatedData.signData;
                todayCheckIn = updatedData.todayCheckIn;
            }

            // 获取一言
            const motto = await this.fetchMotto();

            // 生成签到图片并回复
            await this.generateAndSendCheckInImage(e, signData, todayCheckIn, motto);

        } catch (error) {
            logger.error(`签到出错: ${error.message}`);
            await e.reply("签到过程中出现错误，请稍后再试！");
        }
    }

    /**
     * 获取用户签到状态
     * @param {string} userQQ - 用户QQ号
     * @param {string} todayDate - 今日日期
     * @returns {Object} 用户签到状态信息
     */
    async getUserCheckInStatus(userQQ, todayDate) {
        // 初始化签到数据结构
        let signData = {
            user_qq: userQQ,
            check_in_days: 0,
            check_in_last: "0000-00-00",
            check_in_time: "0000-00-00",
            favorability: 0,
            mora: 0,
            primogems: 0
        };

        let todayCheckIn = {
            td_favorability: 0.0,
            td_mora: 0,
            td_primogems: 0
        };

        // 获取用户签到记录
        const mySignInInfo = await redis.get(`${CHECK_IN_KEY}${userQQ}`);
        logger.info(mySignInInfo)
        // 判断是否为首次签到
        let isFirstTime = mySignInInfo === null;  // 直接使用判断结果赋值

        // 检查今日是否已签到
        let alreadyCheckedIn = false;
        if (!isFirstTime) {
            const lastCheckInJson = await redis.get(`${TODAY_CHECK_IN_KEY}${todayDate}:${userQQ}`);
            if (lastCheckInJson) {
                todayCheckIn = JSON.parse(lastCheckInJson);
                alreadyCheckedIn = true;
            }
            signData = JSON.parse(mySignInInfo);
        }

        return { signData, todayCheckIn, isFirstTime, alreadyCheckedIn };
    }

    /**
     * 处理签到逻辑
     * @param {Object} signData - 用户签到数据
     * @param {Object} todayCheckIn - 今日签到数据
     * @param {boolean} isFirstTime - 是否首次签到
     * @returns {Object} 更新后的签到数据
     */
    async processCheckIn(signData, todayCheckIn, isFirstTime) {
        const currentTime = await this.formatNowTime();
        const todayDate = await this.formatNowDate();

        signData.check_in_time = currentTime;

        // 计算签到奖励
        const rewards = await this.getCheckInInformation(isFirstTime ? 0 : signData.favorability);

        if (isFirstTime) {
            // 首次签到
            signData.check_in_days = 1;
            signData.check_in_last = currentTime;
            signData.favorability = rewards.favorability;
            signData.mora = rewards.mora;
            signData.primogems = 7; // 首次签到固定7原石
        } else {
            // 非首次签到
            signData.favorability = parseFloat(signData.favorability) + parseFloat(rewards.favorability);
            signData.check_in_days = parseFloat(signData.check_in_days) + 1;
            signData.check_in_last = signData.check_in_time;
            signData.mora = parseInt(signData.mora) + parseInt(rewards.mora);
            signData.primogems = parseInt(signData.primogems) + parseInt(rewards.primogems);
        }

        // 更新今日签到信息
        todayCheckIn.td_favorability = rewards.favorability;
        todayCheckIn.td_mora = rewards.mora;
        todayCheckIn.td_primogems = rewards.primogems;

        // 保存数据到Redis
        await this.saveCheckInData(signData, todayCheckIn, todayDate);

        return { signData, todayCheckIn };
    }

    /**
     * 保存签到数据到Redis
     * @param {Object} signData - 用户签到数据
     * @param {Object} todayCheckIn - 今日签到数据
     * @param {string} todayDate - 今日日期
     */
    async saveCheckInData(signData, todayCheckIn, todayDate) {
        const userQQ = signData.user_qq;
        const todayCheckInJson = JSON.stringify(todayCheckIn);
        const signDataJson = JSON.stringify(signData);

        await redis.set(
            `${TODAY_CHECK_IN_KEY}${todayDate}:${userQQ}`,
            todayCheckInJson,
            { EX: REDIS_EXPIRY.DAILY }
        );

        await redis.set(
            `${CHECK_IN_KEY}${userQQ}`,
            signDataJson,
            { EX: REDIS_EXPIRY.QUARTERLY }
        );
    }

    /**
     * 获取签到奖励信息
     * @param {number} currentFavorability - 当前好感度
     * @returns {Object} 签到奖励信息
     */
    async getCheckInInformation(currentFavorability) {
        // 根据当前好感度计算奖励
        const favorabilityMultiplier = Math.max(1, currentFavorability / 10);

        return {
            favorability: (Math.random() * 10).toFixed(2),
            mora: Math.floor(Math.random() * 1000 * favorabilityMultiplier + 1000),
            primogems: Math.floor(Math.random() * 100 * favorabilityMultiplier + 60)
        };
    }

    /**
     * 获取一言
     * @returns {string} 一言内容
     */
    async fetchMotto() {
        try {
            return await fetch(API_CONFIG.MOTTO)
                .then(res => res.text())
                .catch(err => {
                    logger.error(`获取一言失败: ${err}`);
                    return "今天也要元气满满哦~";
                });
        } catch (error) {
            logger.error(`获取一言异常: ${error.message}`);
            return "今天也要元气满满哦~";
        }
    }
    async fetchImgUrl() {
        try {
            // 确保本地图片目录存在
            const fs = require('fs').promises;
            const path = require('path');
            await fs.mkdir(LOCAL_IMG_CONFIG.SAVE_DIR, { recursive: true });

            // 获取本地图片列表
            const files = await fs.readdir(LOCAL_IMG_CONFIG.SAVE_DIR);
            const images = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));

            // 如果本地图片不足10张或需要更新，则从备用API获取新图片
            if (images.length < LOCAL_IMG_CONFIG.MAX_IMAGES) {
                try {
                    const response = await fetch(API_CONFIG.IMG_BAK);
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        const imgUrl = data.data[0].urls.regular;
                        const imgResponse = await fetch(imgUrl);
                        const buffer = await imgResponse.buffer();
                        const fileName = `bg_${Date.now()}.jpg`;
                        await fs.writeFile(path.join(LOCAL_IMG_CONFIG.SAVE_DIR, fileName), buffer);

                        // 如果图片数量超过限制，删除最旧的图片
                        if (images.length >= LOCAL_IMG_CONFIG.MAX_IMAGES) {
                            const oldestImage = images[0];
                            await fs.unlink(path.join(LOCAL_IMG_CONFIG.SAVE_DIR, oldestImage));
                        }

                        return path.join(LOCAL_IMG_CONFIG.SAVE_DIR, fileName);
                    }
                } catch (error) {
                    logger.error(`从备用API获取图片失败: ${error.message}`);
                }
            }

            // 从本地图片中随机选择一张
            if (images.length > 0) {
                const randomImage = images[Math.floor(Math.random() * images.length)];
                return path.join(LOCAL_IMG_CONFIG.SAVE_DIR, randomImage);
            }

            // 如果所有方法都失败，返回默认背景图片
            return './bg.png';
        } catch (error) {
            logger.error(`获取图片URL失败: ${error.message}`);
            return './bg.png';
        }
    }

    /**
     * 生成并发送签到图片
     * @param {Object} e - 消息事件对象
     * @param {Object} signData - 用户签到数据
     * @param {Object} todayCheckIn - 今日签到数据
     * @param {string} motto - 一言内容
     */
    async generateAndSendCheckInImage(e, signData, todayCheckIn, motto) {
        try {
            let lastSignIn = signData.check_in_last;
            if (lastSignIn === "0000-00-00") {
                lastSignIn = "首次签到";
            }
            let qqAvatar = API_CONFIG.AVATAR + signData.user_qq;

            // 获取背景图片URL
            const bgUrl = await this.fetchImgUrl() || './bg.png';

            // 准备模板数据
            const templateData = {
                tplFile: `./plugins/${pluginName}/resources/html/signin/signin.html`,
                dz: _path,
                userInfo: signData,
                qqAvatar: qqAvatar,
                tdInfo: todayCheckIn,
                bgUrl: bgUrl,
                mooto: motto,
                last_sign_in: lastSignIn,
                nickname: e.nickname,
                // 添加响应式布局参数
                layout: {
                    responsive: true,
                    maxWidth: '100%',
                    minHeight: '100%',
                    adaptiveFont: true
                }
            };

            // 生成签到图片
            const img = await puppeteer.screenshot("signin", {
                ...templateData,
            });

            // 发送图片
            await e.reply(img, false, { at: true });
        } catch (error) {
            logger.error(`生成签到图片失败: ${error.message}`);
            await e.reply("生成签到图片失败，但签到数据已记录");
        }
    }

    /**
     * 格式化当前时间为 YYYY-MM-DD HH:mm:ss
     * @returns {string} 格式化后的时间字符串
     */
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
            // 拼接日期分隔符根据自己的需要来修改
            return Y + '-' + M + '-' + D + ' ' + H + ':' + i + ':' + s;
        }

    }

    /**
     * 格式化当前日期为 YYYY-MM-DD
     * @returns {string} 格式化后的日期字符串
     */
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
