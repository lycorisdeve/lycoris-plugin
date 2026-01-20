
import { pluginName } from '../components/lib/Path.js';
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import WorkService from '../model/services/WorkService.js';
import fs from 'fs';
import path from 'path';

const _path = process.cwd();

export class DailyWork extends plugin {
    constructor() {
        super({
            name: '上班打卡',
            dsc: '每日上下班打卡系统',
            event: 'message',
            priority: 2000,
            rule: [{
                reg: "^(上班|下班)$",
                fnc: 'handleWork'
            }, {
                reg: "^(签到|打卡|daka|冒泡)$",
                fnc: 'handleSignIn'
            }]
        });
    }

    async handleSignIn(e) {
        try {
            const result = WorkService.signIn(e.user_id);
            if (result.success) {
                const { mora, primogems, favorability } = result.rewards;
                await e.reply(`签到成功！\n💰 摩拉: +${mora}\n💎 原石: +${primogems}\n❤️ 好感: +${favorability}`, true);
            } else if (result.message === 'already_signed_in') {
                await e.reply('你今天已经签到过了~', true);
            }
        } catch (error) {
            await e.reply('签到失败，请查看日志');
        }
    }

    async handleWork(e) {
        const type = e.msg === '上班' ? 'in' : 'out';

        if (type === 'in') {
            await this.handleClockIn(e);
        } else {
            await this.handleClockOut(e);
        }
    }

    async handleClockIn(e) {
        try {
            const result = WorkService.clockIn(e.user_id);
            if (result.success) {
                await e.reply(`打卡成功！上班时间：${result.time}\n今天也要加油哦！`);
            } else if (result.message === 'already_clocked_in') {
                await e.reply('你今天已经打过上班卡啦！');
            }
        } catch (error) {
            await e.reply('打卡失败，请稍后再试。');
        }
    }

    async handleClockOut(e) {
        try {
            const result = WorkService.clockOut(e.user_id);
            if (!result.success && result.message === 'already_clocked_out') {
                await e.reply('你今天已经打过下班卡啦！');
                return;
            }

            // 生成图片
            const qqAvatar = `https://q1.qlogo.cn/g?b=qq&nk=${e.user_id}&s=640`;

            const data = {
                tplFile: `./plugins/${pluginName}/resources/html/work/work.html`,
                dz: _path,
                copyright: "Lycoris-Plugin",
                nickname: e.nickname,
                qqAvatar: qqAvatar,
                startTime: result.startTime,
                endTime: result.endTime,
                isMissing: result.isMissing,
                wonefei: result.rewards.wonefei,
                duration: result.duration
            };

            const img = await puppeteer.screenshot("work", data);
            await e.reply(img);

        } catch (error) {
            await e.reply('下班打卡失败，请稍后再试。');
        }
    }
}