
const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));

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
                await e.reply(segment.image(result));
                return true;
            }

            // 主API失败，记录并通知
            await this.checkAndSendApiAlert(apiName);

            // 尝试备用API
            const backupUrl = await this.getBackupImage();
            if (backupUrl) {
                await e.reply(segment.image(backupUrl));
                return true;
            }
            return false;
        } catch (error) {
            console.error(`${apiName}图片发送失败:`, error);
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
}
