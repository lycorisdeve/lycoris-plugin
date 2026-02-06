
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
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

                const response = await fetch("https://www.onexiaolaji.cn/RandomPicture/api/?key=qq249663924&type=json", {
                    signal: controller.signal
                }).then(res => res.json());

                clearTimeout(timeoutId);

                if (response.code === 200 && response.url) {
                    background = response.url;
                    logger.info('[DateReminder] 获取随机背景图成功:\n', response);
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    logger.error('[DateReminder] 获取随机背景图超时 (5s)');
                } else {
                    logger.error('[DateReminder] 获取随机背景图失败:', e);
                }
            }

            return await Render.render('html/date/date', {
                ...data,
                background: background,
                copyright: "", // 隐藏底部插件信息
                waitTime: 5000,
                pageGotoParams: {
                    waitUntil: 'networkidle2'
                }
            });
        } catch (err) {
            logger.error('Date Reminder Error:', err);
            return null;
        }
    }
}
