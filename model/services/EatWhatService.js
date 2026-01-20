
import db from '../sqlite3/Database.js';

class EatWhatService {
    constructor() {
        this.initTable();
    }

    /**
     * 初始化数据库表
     */
    initTable() {
        try {
            const createTableSql = `
            CREATE TABLE IF NOT EXISTS eat_what (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                adder_id TEXT,
                added_time TEXT
            );`;
            db.exec(createTableSql);
        } catch (error) {
            logger.error('[EatWhatService] 初始化数据库表失败', error);
        }
    }

    /**
     * 获取推荐食物
     */
    async getRecommendation() {
        let apiRes = null;
        let egg = null;

        // 1. 尝试调用 API
        const apis = [
            'https://zj.v.api.aa1.cn/api/eats/',
            'https://api.istero.com/resource/v1/eat/what?token=YlicDEqnkViPylOKPfCIrqhAaXYFoImw'
        ];

        for (const url of apis) {
            try {
                const response = await fetch(url, { timeout: 5000 });
                if (response.ok) {
                    apiRes = await response.json();
                    if (apiRes) break;
                }
            } catch (error) {
                logger.error(`[EatWhatService] API 调用失败: ${url}`, error.message);
            }
        }

        // 2. 尝试从数据库获取彩蛋
        try {
            const sql = 'SELECT name FROM eat_what ORDER BY RANDOM() LIMIT 1';
            egg = db.prepare(sql).get();
        } catch (error) {
            logger.error('[EatWhatService] 数据库查询失败:', error.message);
        }

        return { apiRes, egg };
    }

    /**
     * 添加食物
     */
    addFood(name, userId) {
        try {
            const checkSql = 'SELECT id FROM eat_what WHERE name = ?';
            const exist = db.prepare(checkSql).get(name);

            if (exist) {
                return { success: false, message: 'exists' };
            }

            const insertSql = 'INSERT INTO eat_what (name, adder_id, added_time) VALUES (?, ?, ?)';
            const now = new Date().toLocaleString();
            db.prepare(insertSql).run(name, userId, now);
            return { success: true };
        } catch (error) {
            logger.error('[EatWhatService] 添加食物失败', error);
            throw error;
        }
    }

    /**
     * 删除食物
     */
    delFood(name) {
        try {
            const deleteSql = 'DELETE FROM eat_what WHERE name = ?';
            const result = db.prepare(deleteSql).run(name);
            return result.changes > 0;
        } catch (error) {
            logger.error('[EatWhatService] 删除食物失败', error);
            throw error;
        }
    }

    /**
     * 获取所有食物列表
     */
    getAllFoods() {
        try {
            const sql = 'SELECT name FROM eat_what';
            return db.prepare(sql).all();
        } catch (error) {
            logger.error('[EatWhatService] 获取菜单失败', error);
            throw error;
        }
    }
}

export default new EatWhatService();
