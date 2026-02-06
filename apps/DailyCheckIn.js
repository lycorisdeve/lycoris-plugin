
import WorkService from '../model/services/WorkService.js';
import Render from '../components/lib/Render.js';

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
                const qqAvatar = `https://q1.qlogo.cn/g?b=qq&nk=${e.user_id}&s=640`;

                const data = {
                    nickname: e.nickname,
                    qqAvatar: qqAvatar,
                    userInfo: {
                        user_qq: e.user_id,
                        check_in_days: result.userStats.total_days,
                        favorability: result.userStats.favorability.toFixed(2),
                        check_in_time: result.userStats.check_in_time,
                        mora: result.userStats.mora,
                        primogems: result.userStats.primogems
                    },
                    tdInfo: {
                        td_favorability: result.rewards.favorability,
                        td_mora: result.rewards.mora,
                        td_primogems: result.rewards.primogems
                    },
                    last_sign_in: result.userStats.last_check_in || '无',
                    mooto: "今天也是充满希望的一天~"
                };

                const img = await Render.render("html/signin/signin", data);
                await e.reply(img);
            } else if (result.message === 'already_signed_in') {
                await e.reply('你今天已经签到过了~', true);
            }
        } catch (error) {
            logger.error('[DailyCheckIn] 签到渲染失败:', error);
            await e.reply('签到失败,请稍后再试');
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
                await this.renderWorkImg(e, result);
            } else if (result.message === 'already_clocked_in') {
                await e.reply('你今天已经打过上班卡啦!');
            }
        } catch (error) {
            await e.reply('打卡失败,请稍后再试。');
        }
    }

    async handleClockOut(e) {
        try {
            const result = WorkService.clockOut(e.user_id);
            if (!result.success && result.message === 'already_clocked_out') {
                await e.reply('你今天已经打过下班卡啦!');
                return;
            }

            await this.renderWorkImg(e, result);

        } catch (error) {
            await e.reply('下班打卡失败,请稍后再试。');
        }
    }

    async renderWorkImg(e, result) {
        const qqAvatar = `https://q1.qlogo.cn/g?b=qq&nk=${e.user_id}&s=640`;

        const data = {
            nickname: e.nickname,
            qqAvatar: qqAvatar,
            startTime: result.startTime,
            endTime: result.endTime,
            isMissing: result.isMissing || false,
            wonefei: result.rewards.wonefei,
            duration: result.duration
        };

        const img = await Render.render("html/work/work", data);
        await e.reply(img);
    }
}