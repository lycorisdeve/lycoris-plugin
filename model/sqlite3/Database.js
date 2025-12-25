
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { pluginRootPath } from '../../components/lib/Path.js';

// Ensure data directory exists
const dataDir = path.join(pluginRootPath, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Global database connection
const db = new Database(path.join(dataDir, 'lycoris.db'));

logger.info('[DB] Database lycoris.db connected successfully.');

export default db;
