
import db from './Database.js';

// --- RSS History Table ---
db.exec(`
    CREATE TABLE IF NOT EXISTS rss_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feedUrl TEXT NOT NULL,
        guid TEXT NOT NULL,
        title TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(feedUrl, guid)
    )
`);

/**
 * RSS History DAO
 */
export const RssHistory = {
    findOne: (feedUrl, guid) => {
        const stmt = db.prepare('SELECT * FROM rss_history WHERE feedUrl = ? AND guid = ?');
        return stmt.get(feedUrl, guid);
    },

    create: (data) => {
        try {
            const stmt = db.prepare('INSERT INTO rss_history (feedUrl, guid, title) VALUES (?, ?, ?)');
            return stmt.run(data.feedUrl, data.guid, data.title);
        } catch (err) {
            if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
                throw err;
            }
        }
    },

    count: (feedUrl) => {
        const stmt = db.prepare('SELECT count(*) as count FROM rss_history WHERE feedUrl = ?');
        const result = stmt.get(feedUrl);
        return result ? result.count : 0;
    },

    bulkCreate: (items) => {
        const insert = db.prepare('INSERT OR IGNORE INTO rss_history (feedUrl, guid, title) VALUES (?, ?, ?)');
        const insertMany = db.transaction((items) => {
            for (const item of items) insert.run(item.feedUrl, item.guid, item.title);
        });
        insertMany(items);
    },

    destroy: (feedUrl) => {
        const stmt = db.prepare('DELETE FROM rss_history WHERE feedUrl = ?');
        stmt.run(feedUrl);
    }
};
