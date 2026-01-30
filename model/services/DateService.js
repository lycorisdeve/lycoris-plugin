
import moment from 'moment';
import { Solar, Lunar } from 'lunar-javascript';

/**
 * 日期服务类
 * 负责提供日历、节日、节气等日期相关信息
 */
class DateService {
    constructor() {
        // 自定义常见阳历节日
        this.customSolarFestivals = {
            '1-1': '元旦',
            '2-14': '情人节',
            '3-8': '妇女节',
            '3-12': '植树节',
            '4-1': '愚人节',
            '5-1': '劳动节',
            '5-4': '青年节',
            '6-1': '儿童节',
            '7-1': '建党节',
            '8-1': '建军节',
            '9-10': '教师节',
            '10-1': '国庆节',
            '11-1': '万圣节',
            '12-25': '圣诞节'
        };
    }

    /**
     * 获取日历展示数据
     * @returns {Promise<Object>} 包含今日信息和即将到来的节日
     */
    async getCalendarData() {
        try {
            const now = new Date();
            const solar = Solar.fromDate(now);
            const lunarDate = solar.getLunar();

            // 计算周末倒计时
            const currentDay = moment(now).day(); // 0 (Sun) to 6 (Sat)
            const toSaturday = (7 + 6 - currentDay) % 7;
            const toSunday = (7 + 0 - currentDay) % 7;

            // 今日信息
            const today = {
                solar: `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`,
                week: `星期${solar.getWeekInChinese()}`,
                lunar: `${lunarDate.getMonthInChinese()}月${lunarDate.getDayInChinese()}`,
                toSaturday,
                toSunday
            };

            // 获取即将到来的节日
            const upcomingFestivals = this.getUpcomingFestivals(now);

            return {
                today,
                next: upcomingFestivals[0] || null,
                others: upcomingFestivals.slice(1, 9) // 增加到 8 个，填充右侧面板
            };
        } catch (error) {
            logger.error('[DateService] 获取日历数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取未来一段时间的节日列表
     * @param {Date} startDate 起始日期
     * @returns {Array} 节日列表
     */
    getUpcomingFestivals(startDate) {
        try {
            const festivals = [];
            const currentSolar = Solar.fromDate(startDate);

            // 查找未来 365 天内的节日
            for (let i = 0; i < 365; i++) {
                const solar = currentSolar.next(i);
                const lunarDate = solar.getLunar();
                const names = [];

                // 1. 获取农历节日
                const lunarFestivals = lunarDate.getFestivals();
                if (lunarFestivals && lunarFestivals.length > 0) {
                    names.push(...lunarFestivals);
                }

                // 2. 获取阳历节日
                const solarFestivals = solar.getFestivals();
                if (solarFestivals && solarFestivals.length > 0) {
                    names.push(...solarFestivals);
                }

                // 3. 获取自定义阳历节日
                const key = `${solar.getMonth()}-${solar.getDay()}`;
                if (this.customSolarFestivals[key]) {
                    if (!names.includes(this.customSolarFestivals[key])) {
                        names.push(this.customSolarFestivals[key]);
                    }
                }

                // 4. 获取节气
                const jieQi = lunarDate.getJieQi();
                if (jieQi) {
                    names.push(jieQi);
                }

                // 如果有节日，添加到列表
                if (names.length > 0) {
                    const targetMoment = moment(solar.toYmd(), 'YYYY-MM-DD');
                    const diff = targetMoment.diff(moment(startDate).startOf('day'), 'days');

                    if (diff >= 0) {
                        names.forEach(name => {
                            // 去重
                            if (festivals.find(f => f.name === name)) return;

                            festivals.push({
                                name: name,
                                date: `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`,
                                diff: diff,
                                moment: targetMoment
                            });
                        });
                    }
                }

                // 如果已经找够了 10 个节日，且时间跨度超过 30 天，提前结束
                if (festivals.length >= 10 && i > 30) break;
            }

            // 按距离排序
            festivals.sort((a, b) => a.diff - b.diff);

            return festivals;
        } catch (error) {
            logger.error('[DateService] 获取节日列表失败:', error);
            return [];
        }
    }
}

export default new DateService();
