
import WorkDb from '../sqlite3/WorkDb.js';

class WorkService {
    constructor() {
    }

    getTodayDate() {
        const now = new Date();
        const Y = now.getFullYear();
        const M = (now.getMonth() + 1).toString().padStart(2, '0');
        const D = now.getDate().toString().padStart(2, '0');
        return `${Y}-${M}-${D}`;
    }

    getNowTime() {
        const now = new Date();
        const H = now.getHours().toString().padStart(2, '0');
        const i = now.getMinutes().toString().padStart(2, '0');
        const s = now.getSeconds().toString().padStart(2, '0');
        return `${H}:${i}:${s}`;
    }

    /**
     * 上班打卡
     */
    clockIn(userId) {
        const date = this.getTodayDate();
        const time = this.getNowTime();

        try {
            // 检查今日是否已存在记录
            const exist = WorkDb.getTodayLog(userId, date);

            if (exist) {
                return { success: false, message: 'already_clocked_in' };
            }

            // 插入新记录
            WorkDb.createLog(userId, date, time, 0);

            return { success: true, time, date };
        } catch (error) {
            logger.error('[WorkService] 上班打卡失败', error);
            throw error;
        }
    }

    /**
     * 下班打卡
     */
    clockOut(userId) {
        const date = this.getTodayDate();
        const time = this.getNowTime();

        try {
            // 获取今日记录
            let record = WorkDb.getTodayLog(userId, date);
            let isMissing = false;

            // 如果没有上班记录，视为缺卡，自动补一条
            if (!record) {
                isMissing = true;
                WorkDb.createLog(userId, date, '缺卡', 1);
                record = { start_time: '缺卡' };
            } else if (record.status === 1) {
                return { success: false, message: 'already_clocked_out' };
            }

            // 更新下班时间
            WorkDb.updateLog(userId, date, time);

            // 计算时长和薪水
            const durationMs = new Date(`${date} ${time}`) - new Date(`${date} ${record.start_time !== '缺卡' ? record.start_time : time}`);
            const durationHours = durationMs / (1000 * 60 * 60);

            // 基础时薪 30 + 随机浮动
            const hourlyRate = 30 + Math.random() * 10;
            // 缺卡没有薪水
            const wonefei = record.start_time === '缺卡' ? 0 : Math.floor(durationHours * hourlyRate);

            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            const durationStr = `${hours}小时${minutes}分`;

            const rewards = { wonefei, favorability: 0, mora: 0, primogems: 0 };

            // 更新用户统计
            WorkDb.updateUserStats(userId, rewards, null);

            return {
                success: true,
                startTime: record.start_time,
                endTime: time,
                isMissing,
                rewards,
                duration: durationStr
            };
        } catch (error) {
            logger.error('[WorkService] 下班打卡失败', error);
            throw error;
        }
    }

    /**
     * 每日签到
     */
    signIn(userId) {
        const date = this.getTodayDate();

        try {
            const user = WorkDb.getUserStats(userId);
            if (user && user.last_check_in === date) {
                return { success: false, message: 'already_signed_in' };
            }

            const rewards = this.calculateRewards();

            // 签到要更新 last_check_in
            WorkDb.updateUserStats(userId, rewards, date);

            return { success: true, rewards };
        } catch (error) {
            logger.error('[WorkService] 签到失败', error);
            throw error;
        }
    }

    calculateRewards() {
        return {
            favorability: parseFloat((Math.random() * 5).toFixed(2)),
            mora: Math.floor(Math.random() * 500 + 500),
            primogems: Math.floor(Math.random() * 50 + 10)
        };
    }
}

export default new WorkService();
