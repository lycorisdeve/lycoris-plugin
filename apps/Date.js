
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { pluginResources } from '../components/lib/Path.js';

import service from '../model/services/DateService.js';
import Render from '../components/lib/Render.js';
import Config from '../components/Config.js';
import moment from 'moment';

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

export class DatePlugin extends plugin {
    constructor() {
        super({
            name: '日期提醒',
            dsc: '显示今日日期与节日倒计时',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(日期|今天几号|节日)$',
                    fnc: 'dateReminder'
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
            const data = await service.getCalendarData();
            data.today.day = moment().date();

            // 获取随机背景图
            let background = "";
            let tempFile = null;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

                const response = await fetch("https://api.lolimi.cn/API/cosplay/api?type=value", {
                    signal: controller.signal
                }).then(res => res.json());

                clearTimeout(timeoutId);

                if (response.code === "1" && response.data?.data?.length > 0) {
                    const imgList = response.data.data;
                    let bgUrl = imgList[Math.floor(Math.random() * imgList.length)];
                    if (bgUrl && bgUrl.startsWith('http://')) {
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
            } catch (e) {
                if (e.name === 'AbortError') {
                    logger.error('[DateReminder] 获取随机背景图超时 (5s)');
                } else {
                    logger.error('[DateReminder] 获取随机背景图失败:', e);
                }
            }

            const res = await Render.render('html/date/date', {
                ...data,
                background: background,
                copyright: "", // 隐藏底部插件信息
                waitTime: 50000,
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
}
