
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

    // API响应处理方法
    processApiResponse(apiName, response) {
        try {
            switch (apiName) {
                case 'MEINV':
                    // MEINV API返回格式: { data: { image: "url" } }
                    return response?.data?.image;

                case 'COSPLAY':
                    // COSPLAY API返回格式: { code: 1, data: { data: [...] } }
                    if (response?.code === 1 && Array.isArray(response?.data?.data)) {
                        const randomIndex = Math.floor(Math.random() * response.data.data.length);
                        return response.data.data[randomIndex]?.url;
                    }
                    return null;

                case 'TAOBAO':
                    // TAOBAO API返回格式: { data: { imgUrl: "url" } }
                    return response?.data?.imgUrl;

                case 'WALLPAPER':
                    // WALLPAPER API返回格式: { url: "url" }
                    return response?.url;

                case 'COS':
                    // COS API返回格式: { pic: "url" }
                    return response?.pic;

                case 'LOVEANIMER':
                    // LOVEANIMER API返回格式: { url: "url" }
                    return response?.url;

                case 'BACKUP':
                    // BACKUP API返回格式: { error: false, data: [{ urls: { regular: "url" } }] }
                    if (!response?.error && response?.data?.length > 0) {
                        return response.data[0]?.urls?.regular;
                    }
                    return null;

                default:
                    logger.warn(`未知的API类型: ${apiName}`);
                    return null;
            }
        } catch (error) {
            logger.error(`处理API响应失败 [${apiName}]:`, error);
            return null;
        }
    }

    // 检查图片是否为R18
    isR18Image(apiName, response) {
        try {
            switch (apiName) {
                case 'BACKUP':
                    return response?.data?.[0]?.r18 || false;
                // 其他API的R18检查逻辑可以根据需要添加
                default:
                    return false;
            }
        } catch (error) {
            logger.error(`检查R18状态失败 [${apiName}]:`, error);
            return false;
        }
    }

    // 生成二维码URL
    generateQRCode(imageUrl) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(imageUrl)}`;
    }

    // 发送图片的通用方法
    async sendImageWithFallback(e, apiName, getImageFn) {
        try {
            const response = await getImageFn();
            const imageUrl = this.processApiResponse(apiName, response);

            if (imageUrl) {
                try {
                    // 检查是否为R18图片
                    const isR18 = this.isR18Image(apiName, response);

                    if (isR18) {
                        // 如果是R18图片，生成二维码
                        const qrcodeUrl = this.generateQRCode(imageUrl);
                        // 发送二维码图片和提示信息
                        const msg = [
                            segment.text('R18内容已转换为二维码，请自行扫码查看\n'),
                            segment.image(qrcodeUrl)
                        ];
                        let flag = await e.reply(msg);
                        return flag;
                    } else {
                        // 非R18图片正常发送
                        await e.reply(segment.image(imageUrl));
                        return true;
                    }
                } catch (sendError) {
                    logger.warn(`${apiName}图片发送失败，尝试使用合并转发方式`, sendError);
                }
            }

            // 主API失败，记录并通知
            await this.checkAndSendApiAlert(apiName);

            // 尝试备用API
            const backupResponse = await this.fetchWithRetry(API_CONFIG.BACKUP);
            const backupUrl = this.processApiResponse('BACKUP', backupResponse);

            if (backupUrl) {
                try {
                    // 检查备用图片是否为R18
                    const isBackupR18 = this.isR18Image('BACKUP', backupResponse);

                    if (isBackupR18) {
                        // 如果是R18图片，生成二维码
                        const qrcodeUrl = this.generateQRCode(backupUrl);
                        const msg = [
                            segment.text('R18内容已转换为二维码，请自行扫码查看\n'),
                            segment.image(qrcodeUrl)
                        ];
                        return await e.reply(msg);
                    } else {
                        // 非R18图片正常发送
                        await e.reply(segment.image(backupUrl));

                        return true;
                    }
                } catch (sendError) {
                    logger.warn(`${apiName}备用图片发送失败，尝试使用合并转发方式`, sendError);
                }
            }
            return false;
        } catch (error) {
            logger.error(`${apiName}图片发送失败:`, error);
            return false;
        }
    }

    // 修改各个API调用方法
    async pic1(e) {
        await this.sendImageWithFallback(e, 'MEINV', async () => {
            return await this.fetchWithRetry(API_CONFIG.MEINV);
        });
    }

    async pic2(e) {
        await this.sendImageWithFallback(e, 'COSPLAY', async () => {
            return await this.fetchWithRetry(API_CONFIG.COSPLAY + '?type=all');
        });
    }

    async pic3(e) {
        await this.sendImageWithFallback(e, 'TAOBAO', async () => {
            return await this.fetchWithRetry(API_CONFIG.TAOBAO + '?type=json');
        });
    }

    async pic4(e) {
        await this.sendImageWithFallback(e, 'WALLPAPER', async () => {
            return await this.fetchWithRetry(API_CONFIG.WALLPAPER + '?type=json');
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
