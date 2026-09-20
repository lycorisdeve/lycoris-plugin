
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { pluginResources } from '../components/lib/Path.js';

import dateService from '../model/services/DateService.js';
import Render from '../components/lib/Render.js';
import Config from '../components/Config.js';
import moment from 'moment';
import foodService from '../model/services/EatWhatService.js';

const config = Config.getConfig('config').dateReminder || {
    isPush: true,
    schedule: {
        hour: '8',
        minute: '30',
        second: '0'
    },
    group_ids: [],
    private_ids: []
};

const CRON_EXPRESSION = `${config.schedule.second} ${config.schedule.minute} ${config.schedule.hour} * * *`;

export class DailyLife extends plugin {
    constructor() {
        super({
            name: '日常生活',
            dsc: '日期节日提醒与饮食推荐、菜单管理',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(日期|今天几号|节日)$',
                    fnc: 'dateReminder'
                },
                {
                    reg: '(吃(什么|啥)|(今天|今晚|中午|早上|夜宵)吃(什么|啥))',
                    fnc: 'eat'
                },
                {
                    reg: '^#?添加食物\\s*(.*)$',
                    fnc: 'addFood'
                },
                {
                    reg: '^#?删除食物\\s*(.*)$',
                    fnc: 'delFood'
                },
                {
                    reg: '^#?((食物)?菜单|食物列表)$',
                    fnc: 'listFood'
                }
            ]
        });
        this.task = {
            name: '每日日期推送',
            fnc: () => this.sendDateReminder(),
            cron: CRON_EXPRESSION
        };
    }

    /**
     * 指令触发
     */
    async dateReminder(e) {
        const img = await this.getDateReminderImg();
        if (img) {
            await e.reply(img);
        } else {
            await e.reply('日历渲染失败,请稍后再试~');
        }
    }

    /**
     * 定时推送触发
     */
    async sendDateReminder() {
        if (!config.isPush) return;
        const img = await this.getDateReminderImg();
        if (!img) return;

        const sendPromises = [
            ...(config.private_ids || []).map(qq =>
                Bot.sendPrivateMsg(qq, img).catch(err => logger.error(err))
            ),
            ...(config.group_ids || []).map(groupId =>
                Bot.sendGroupMsg(groupId, img).catch(err => logger.error(err))
            )
        ];
        await Promise.all(sendPromises);
    }

    /**
     * 获取渲染后的图片
     */
    async getDateReminderImg() {
        try {
            const data = await dateService.getCalendarData();
            data.today.day = moment().date();

            // 获取随机背景图
            let background = "";
            let tempFile = null;
            let bgUrl = null;

            try {
                // 首先尝试 dwo.cc API
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

                const response = await fetch("https://openapi.dwo.cc/api/meinv", {
                    signal: controller.signal
                }).then(res => res.json());

                clearTimeout(timeoutId);

                if (response.image_url) {
                    bgUrl = response.image_url;
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    logger.error('[DateReminder] 获取 dwo.cc 随机背景图超时 (5s)');
                } else {
                    logger.error('[DateReminder] 获取 dwo.cc 随机背景图失败:', e);
                }
            }

            // 如果 dwo.cc API 失败，尝试备用 API
            if (!bgUrl) {
                try {
                    const fallbackController = new AbortController();
                    const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 5000); // 5秒超时

                    const fallbackResponse = await fetch("https://api.lolimi.cn/API/cosplay/api?type=value", {
                        signal: fallbackController.signal
                    }).then(res => res.json());

                    clearTimeout(fallbackTimeoutId);

                    if (fallbackResponse.code === "1" && fallbackResponse.data?.data?.length > 0) {
                        const imgList = fallbackResponse.data.data;
                        bgUrl = imgList[Math.floor(Math.random() * imgList.length)];
                    }
                } catch (e) {
                    if (e.name === 'AbortError') {
                        logger.error('[DateReminder] 获取备用背景图超时 (5s)');
                    } else {
                        logger.error('[DateReminder] 获取备用背景图失败:', e);
                    }
                }
            }

            if (bgUrl) {
                if (bgUrl.startsWith('http://')) {
                    bgUrl = bgUrl.replace('http://', 'https://');
                }

                try {
                    const tempDir = path.join(pluginResources, 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    const imgName = `date_bg_${Date.now()}.jpg`;
                    tempFile = path.join(tempDir, imgName);

                    const imgController = new AbortController();
                    const imgTimeoutId = setTimeout(() => imgController.abort(), 15000); // 15秒超时下载图片

                    const imgRes = await fetch(bgUrl, { signal: imgController.signal });
                    if (!imgRes.ok) throw new Error(`HTTP 状态码: ${imgRes.status}`);

                    const arrayBuffer = await imgRes.arrayBuffer();
                    clearTimeout(imgTimeoutId);

                    const buffer = Buffer.from(arrayBuffer);
                    await fs.promises.writeFile(tempFile, buffer);

                    background = pathToFileURL(tempFile).href;
                    logger.info(`[DateReminder] 下载图片到临时文件成功: ${imgName}`);
                } catch (err) {
                    logger.error('[DateReminder] 下载图片失败，降级使用外接URL链接:', err);
                    background = bgUrl;
                }
            }

            const res = await Render.render('html/date/date', {
                ...data,
                background: background,
                copyright: "", // 隐藏底部插件信息
                waitTime: 5000,
                pageGotoParams: {
                    waitUntil: 'networkidle2'
                }
            });

            if (tempFile && fs.existsSync(tempFile)) {
                fs.promises.unlink(tempFile).catch(err => {
                    logger.error('[DateReminder] 删除临时背景图失败:', err);
                });
            }

            return res;
        } catch (err) {
            logger.error('Date Reminder Error:', err);
            return null;
        }
    }
    /**
     * 随机推荐食物
     */
    async eat(e) {
        const { apiRes, egg } = await foodService.getRecommendation();
        let foodNames = [];
        let msg = '';
        let eggMsg = '';

        if (apiRes && apiRes.code === 200) {
            msg = '今天吃\n';
            if (apiRes.food) {
                msg += apiRes.food;
                foodNames.push(apiRes.food);
            } else if (apiRes.data && apiRes.data.food) {
                msg += apiRes.data.food;
                foodNames.push(apiRes.data.food);
            } else if (apiRes.meal1) {
                msg += `${apiRes.meal1}\n${apiRes.meal2}`;
                foodNames.push(apiRes.meal1, apiRes.meal2);
            }

            // 30% 几率额外追加一个彩蛋食物
            if (egg && Math.random() < 0.3) {
                eggMsg = `\n或者再来点额外的 "${egg.name}"?`;
                foodNames.push(egg.name);
            }
        } else if (egg) {
            foodNames.push(egg.name);
            const replies = [
                `推荐吃:${egg.name}`,
                `今天就吃 ${egg.name} 吧!`,
                `要不试试 ${egg.name}?`
            ];
            msg = replies[Math.floor(Math.random() * replies.length)];
        }

        if (msg) {
            let replyMsg = [msg];
            // 遍历所有食物名称获取图片
            for (let name of foodNames) {
                const imageUrl = await foodService.getFoodImage(name);
                if (imageUrl) {
                    replyMsg.push(segment.image(imageUrl));
                }
            }
            //彩蛋信息 调整到最后面
            if (eggMsg) {
                replyMsg.push(eggMsg);
            }
            await e.reply(replyMsg);
        } else {
            await e.reply('呜呜,菜单空空的,API 也罢工了,要不去添加点食物(发送"添加食物 xxxx")?或者干脆喝点凉水吧!');
        }
    }


    /**
     * 添加食物 (彩蛋)
     */
    async addFood(e) {
        let name = e.msg.replace(/^#?添加食物\s*/, '').trim();
        if (!name) {
            await e.reply('请指定要添加的食物名称,例如:添加食物 电脑屏幕');
            return;
        }

        try {
            const result = foodService.addFood(name, e.user_id);
            if (result.success) {
                await e.reply(`成功将 "${name}" 加入彩蛋!`);
            } else if (result.message === 'exists') {
                await e.reply(`"${name}" 已经在彩蛋列表里啦。`);
            }
        } catch (error) {
            await e.reply('添加失败,请查看日志');
        }
    }

    /**
     * 删除食物
     */
    async delFood(e) {
        let name = e.msg.replace(/^#?删除食物\s*/, '').trim();
        if (!name) {
            await e.reply('请指定要删除的食物名称。');
            return;
        }

        try {
            const success = foodService.delFood(name);
            if (success) {
                await e.reply(`已从彩蛋中移除 "${name}"。`);
            } else {
                await e.reply(`没找到 "${name}" 呢。`);
            }
        } catch (error) {
            await e.reply('删除失败。');
        }
    }

    /**
     * 列出所有食物 (彩蛋列表)
     */
    async listFood(e) {
        try {
            const rows = foodService.getAllFoods();
            if (rows.length === 0) {
                await e.reply('当前彩蛋列表是空的。');
                return;
            }

            const foodList = rows.map(r => r.name).join('、');
            const msg = `当前共有 ${rows.length} 个彩蛋食物:\n${foodList}`;
            await e.reply(msg);
        } catch (error) {
            await e.reply('获取失败。');
        }
    }
}
