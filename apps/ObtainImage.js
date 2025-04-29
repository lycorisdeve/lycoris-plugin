
const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));
import { segment } from 'icqq';
import fetch from 'node-fetch';  // Make sure this import is available

// API 配置
const API_CONFIG = {
    COS: 'https://api.qvqa.cn/cos?type=json',
    LOVEANIMER: 'https://api.lolimi.cn/API/loveanimer',
    MEINV: 'https://api.lolimi.cn/API/meinv/api.php',
    COSPLAY: 'https://api.lolimi.cn/API/cosplay/api.php',
    TAOBAO: 'https://api.03c3.cn/api/taobaoBuyerShow',
    WALLPAPER: 'https://api.vvhan.com/api/wallpaper/pcGirl',
    BACKUP: 'https://api.lolicon.app/setu/v2?size=regular',

};

// 常量配置
const CONSTANTS = {
    SLEEP_TIME: 600,
    MAX_RETRY_COUNT: 3,
    DEFAULT_RECALL_TIME: -1,
    MAX_FALLBACK_COUNT: 3,
    API_ALERT_EXPIRE: 7 * 24 * 60 * 60  // 7天的秒数
};

export class Photo extends plugin {
    constructor() {
        super({
            name: '图片获取',
            dsc: '图片获取',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#动漫写真$',
                    fnc: 'btSearch'
                },
                {
                    reg: '写真',
                    fnc: 'HDPhoto'
                },
                {
                    reg: '^#高清壁纸$',
                    fnc: 'HDWallpaper'
                },
                {
                    reg: '^#游戏壁纸$',
                    fnc: 'HDGame'
                },
                {
                    reg: '肝|太强了|带带|摸鱼|装备|技能',
                    fnc: 'pic'
                },
                {
                    reg: '酒仙|井空|老猫|猫佬|羊总|猫哥|卢蛇|小丑|马飞|开哥',
                    fnc: 'pic1'
                },
                {
                    reg: '紫卡|灵化|白鸡|大佬|吗喽|捞',
                    fnc: 'pic2'
                },
                {
                    reg: '#来点cos',
                    fnc: 'cosMp4'
                },
                {
                    reg: '原神|电波|声望|买家秀',
                    fnc: 'pic3'
                },
                {
                    reg: '图',
                    fnc: 'pic4'
                }
            ]
        })
        this.masterQQ = Bot.uin;  // 主人QQ
    }

    // 检查并发送API警告
    async checkAndSendApiAlert(apiName) {
        const key = `Lycoris:apiAlert:${apiName}`;
        const hasAlert = await redis.get(key);
        if (!hasAlert) {
            // 发送警告消息给主人
            Bot.pickUser(this.masterQQ).sendMsg(`警告：API ${apiName} 已失联，请检查`);
            // 设置一周的过期时间
            await redis.set(key, '1', { EX: CONSTANTS.API_ALERT_EXPIRE });
        }
    }

    // 使用备用API获取图片
    async getBackupImage() {
        const v = [0, 1, 2];  
        const randomR18 = v[Math.floor(Math.random() * v.length)];

        try {
            const backupApi = `${API_CONFIG.BACKUP}&r18=${randomR18}`;
            const response = await this.fetchWithRetry(backupApi);
            if (response.error) return null;
            return response.data[0]?.urls?.regular;
        } catch (error) {
            console.error('备用API调用失败:', error);
            return null;
        }
    }

    // 发送图片的通用方法
    async sendImageWithFallback(e, apiName, getImageFn) {
        try {
            const result = await getImageFn();
            if (result) {
                try {
                    // 尝试直接发送图片
                    await e.reply(segment.image(result));
                    return true;
                } catch (sendError) {
                    // 图片发送失败，尝试使用引用+合并转发的方式
                    logger.warn(`${apiName}图片直接发送失败，尝试使用合并转发方式`, sendError);
                    return await this.sendByForward(e, result);
                }
            }

            // 主API失败，记录并通知
            await this.checkAndSendApiAlert(apiName);

            // 尝试备用API
            const backupUrl = await this.getBackupImage();
            if (backupUrl) {
                try {
                    // 尝试直接发送备用图片
                    await e.reply(segment.image(backupUrl));
                    return true;
                } catch (sendError) {
                    // 备用图片发送失败，尝试使用引用+合并转发的方式
                    logger.warn(`${apiName}备用图片直接发送失败，尝试使用合并转发方式`, sendError);
                    return await this.sendByForward(e, backupUrl);
                }
            }
            return false;
        } catch (error) {
            console.error(`${apiName}图片发送失败:`, error);
            return false;
        }
    }

    // 使用合并转发的方式发送图片
    async sendByForward(e, imgUrl) {
        try {
            // 创建包含图片的消息
            const imgMsg = segment.image(imgUrl);
            
            // 准备合并转发消息
            let nickname = Bot.nickname;
            if (e.isGroup) {
                let info = await Bot.getGroupMemberInfo(e.group_id, Bot.uin);
                nickname = info.card || info.nickname;
            }
            
            const userInfo = {
                user_id: Bot.uin,
                nickname
            };
            
            // 构建转发消息列表
            const forwardMsg = [];
            
            // 添加标题消息
            forwardMsg.push({
                ...userInfo,
                message: '获取到的图片：'
            });
            
            // 直接创建引用消息对象并添加到合并转发消息中
            // 创建一个引用消息和图片的组合
            const referenceMsg = {
                ...userInfo,
                message: [
                    // 直接创建引用消息对象，不需要先发送消息
                    {
                        type: 'quote',
                        data: {
                            // 使用当前消息的信息
                            user_id: e.sender.user_id,
                            time: parseInt(Date.now() / 1000),
                            seq: e.seq || 0,
                            // 可以添加其他必要的引用信息
                            content: '查看图片'
                        }
                    },
                    imgMsg
                ]
            };
            
            // 添加引用+图片的组合消息
            forwardMsg.push(referenceMsg);
            
            // 制作并发送合并转发消息
            let sendMsg;
            if (e.isGroup) {
                sendMsg = await e.group.makeForwardMsg(forwardMsg);
            } else {
                sendMsg = await e.friend.makeForwardMsg(forwardMsg);
            }
            
            // 发送合并转发消息
            await e.reply(sendMsg, false);
            return true;
        } catch (error) {
            logger.error('合并转发发送图片失败:', error);
            return false;
        }
    }

    async pic1(e) {
        await this.sendImageWithFallback(e, 'MEINV', async () => {
            const imgUrl = await this.fetchWithRetry(API_CONFIG.MEINV, { type: 'text' });
            return imgUrl;
        });
    }

    async pic2(e) {
        try {
            const imgInfo = await this.fetchWithRetry(API_CONFIG.COSPLAY + '?type=all');
            if (imgInfo.code === 1 && Array.isArray(imgInfo.data.data)) {
                const msgs = this.formatCosplayMessages(imgInfo);
                await this.sendMessage(e, msgs, this.e.isPrivate);
                return;
            }

            // API失败，发送警告并使用备用API
            await this.checkAndSendApiAlert('COSPLAY');
            const backupUrl = await this.getBackupImage();
            if (backupUrl) {
                await e.reply(segment.image(backupUrl));
            } else {
                await e.reply('获取图片失败，请稍后重试');
            }
        } catch (error) {
            console.error('获取cosplay图片失败:', error);
        }
    }

    async pic3(e) {
        await this.sendImageWithFallback(e, 'TAOBAO', async () => {
            const imgInfo = await this.fetchWithRetry(API_CONFIG.TAOBAO + '?type=json');
            return imgInfo.data.imgUrl;
        });
    }

    async pic4(e) {
        await this.sendImageWithFallback(e, 'WALLPAPER', async () => {
            const imgInfo = await this.fetchWithRetry(API_CONFIG.WALLPAPER + '?type=json');
            return imgInfo.url;
        });
    }

    // Add this method to your class
    async fetchWithRetry(url, options = {}, retryCount = 0) {
        try {
            // Handle text response type
            if (options.type === 'text') {
                const response = await fetch(url);
                return await response.text();
            }
            
            // Handle JSON response type (default)
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            // Retry logic
            if (retryCount < CONSTANTS.MAX_RETRY_COUNT) {
                console.log(`Retry attempt ${retryCount + 1} for ${url}`);
                await sleep(CONSTANTS.SLEEP_TIME);
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            
            console.error(`Failed to fetch ${url} after ${CONSTANTS.MAX_RETRY_COUNT} attempts:`, error);
            throw error;
        }
    }
}
