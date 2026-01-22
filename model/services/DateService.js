
import moment from 'moment';
import lunar from './lunar.js';

const { Solar, Lunar } = lunar;

class DateService {
    constructor() {
        // 自定义一些常见的阳历节日 (lunar-javascript 本身主要关注法定节假日和农历节日)
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
     */
    async getCalendarData() {
        const now = new Date();
        const solar = Solar.fromDate(now);
        const lunar = solar.getLunar();

        const today = {
            solar: `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`,
            week: `星期${solar.getWeekInChinese()}`,
            lunar: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
        };

        const upcomingFestivals = this.getUpcomingFestivals(now);

        return {
            today,
            next: upcomingFestivals[0],
            others: upcomingFestivals.slice(1, 6)
        };
    }

    /**
     * 获取未来一段时间的节日列表 (支持动态年份)
     */
    getUpcomingFestivals(startDate) {
        let festivals = [];
        let currentSolar = Solar.fromDate(startDate);

        // 查找未来 365 天内的节日
        for (let i = 0; i < 365; i++) {
            const solar = currentSolar.next(i);
            const lunar = solar.getLunar();

            let names = [];

            // 1. 获取阴历节日
            const lunarFestivals = lunar.getFestivals();
            if (lunarFestivals.length > 0) names.push(...lunarFestivals);

            // 2. 获取阳历节日
            const solarFestivals = solar.getFestivals();
            if (solarFestivals.length > 0) names.push(...solarFestivals);

            // 3. 获取自定义阳历节日
            const key = `${solar.getMonth()}-${solar.getDay()}`;
            if (this.customSolarFestivals[key]) {
                if (!names.includes(this.customSolarFestivals[key])) {
                    names.push(this.customSolarFestivals[key]);
                }
            }

            // 4. 获取节气
            const jieQi = lunar.getJieQi();
            if (jieQi) names.push(jieQi);

            if (names.length > 0) {
                const targetMoment = moment(solar.toYmd(), 'YYYY-MM-DD');
                const diff = targetMoment.diff(moment(startDate).startOf('day'), 'days');

                if (diff >= 0) {
                    names.forEach(name => {
                        // 过滤掉一些不想要的或者重复的
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

            // 如果已经找够了 10 个节日，且时间跨度超过 30 天，可以提前结束
            if (festivals.length >= 10 && i > 30) break;
        }

        // 排序
        festivals.sort((a, b) => a.diff - b.diff);

        return festivals;
    }
}

export default new DateService();
