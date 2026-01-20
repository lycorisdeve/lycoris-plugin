
import db from './Database.js';

class WorkDb {
    constructor() {
        this.initTable();
    }

    initTable() {
        // 用户统计表
        const createStatsTable = `
        CREATE TABLE IF NOT EXISTS work_stats (
            user_id TEXT PRIMARY KEY,
            total_days INTEGER DEFAULT 0,
            favorability REAL DEFAULT 0,
            mora INTEGER DEFAULT 0,
            primogems INTEGER DEFAULT 0,
            wonefei INTEGER DEFAULT 0,
            last_check_in TEXT
        );`;
        db.exec(createStatsTable);

        // 尝试添加 wonefei 列（如果不存在）
        try {
            db.exec('ALTER TABLE work_stats ADD COLUMN wonefei INTEGER DEFAULT 0');
        } catch (error) {
            // 列已存在，忽略错误
        }

        // 每日打卡记录表
        const createLogTable = `
        CREATE TABLE IF NOT EXISTS work_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            date TEXT,
            start_time TEXT,
            end_time TEXT,
            status INTEGER DEFAULT 0, -- 0: 上班中, 1: 已下班
            UNIQUE(user_id, date)
        );`;
        db.exec(createLogTable);
    }

    /**
     * 获取用户统计
     */
    getUserStats(userId) {
        const sql = 'SELECT * FROM work_stats WHERE user_id = ?';
        return db.prepare(sql).get(userId);
    }

    /**
     * 更新用户统计
     */
    updateUserStats(userId, rewards, checkInDate = null) {
        const user = this.getUserStats(userId);
        const wonefei = rewards.wonefei || 0; // 如果没有 wonefei 也就是签到，则为 0

        if (user) {
            const updateSql = `
                UPDATE work_stats 
                SET total_days = total_days + 1,
                    favorability = favorability + ?,
                    mora = mora + ?,
                    primogems = primogems + ?,
                    wonefei = wonefei + ?,
                    last_check_in = COALESCE(?, last_check_in)
                WHERE user_id = ?`;
            db.prepare(updateSql).run(rewards.favorability, rewards.mora, rewards.primogems, wonefei, checkInDate, userId);
        } else {
            const insertSql = `
                INSERT INTO work_stats (user_id, total_days, favorability, mora, primogems, wonefei, last_check_in)
                VALUES (?, 1, ?, ?, ?, ?, ?)`;
            db.prepare(insertSql).run(userId, rewards.favorability, rewards.mora, rewards.primogems, wonefei, checkInDate);
        }
    }

    /**
     * 获取用户今日记录
     */
    getTodayLog(userId, date) {
        const sql = 'SELECT * FROM work_log WHERE user_id = ? AND date = ?';
        return db.prepare(sql).get(userId, date);
    }

    /**
     * 创建打卡记录
     */
    createLog(userId, date, time, status = 0) {
        const sql = 'INSERT INTO work_log (user_id, date, start_time, status) VALUES (?, ?, ?, ?)';
        return db.prepare(sql).run(userId, date, time, status);
    }

    /**
     * 更新打卡记录（下班）
     */
    updateLog(userId, date, endTime) {
        const sql = 'UPDATE work_log SET end_time = ?, status = 1 WHERE user_id = ? AND date = ?';
        return db.prepare(sql).run(endTime, userId, date);
    }
}

export default new WorkDb();
