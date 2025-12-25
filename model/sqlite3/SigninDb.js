
import db from './Database.js';

// --- Signin Table ---
db.exec(`
    CREATE TABLE IF NOT EXISTS signin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        last_date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
    )
`);

/**
 * Signin DAO Placeholder
 */
export const Signin = {
    // Methods will be added later
};
