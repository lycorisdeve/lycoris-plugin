
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { pluginRootPath } from '../../components/lib/Path.js';

// 定义数据库路径
const dbPath = path.join(pluginRootPath, 'data', 'sqlite3', 'lycoris.db');
const dbDir = path.dirname(dbPath);

// 确保目录存在
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 全局数据库连接
const db = new Database(dbPath);

logger.info(`[DB] 数据库已连接: ${path.relative(pluginRootPath, dbPath)}`);

export default db;
