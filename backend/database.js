const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'trace_vault.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDb();
    }
});

function initializeDb() {
    db.serialize(() => {
        // Create Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )
        `);

        // Create Evidence Table
        db.run(`
            CREATE TABLE IF NOT EXISTS evidence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_ref TEXT NOT NULL,
                file_name TEXT NOT NULL,
                hash TEXT NOT NULL,
                image_path TEXT,
                uploaded_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Logs Table
        db.run(`
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                username TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed initial admin and user if not exists
        db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
            if (!row) {
                const adminPass = bcrypt.hashSync('admin123', 10);
                const userPass = bcrypt.hashSync('user123', 10);
                
                db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', adminPass, 'Admin']);
                db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['inspector_sharma', userPass, 'User']);
                console.log('Seeded default users (admin/admin123, inspector_sharma/user123)');
                
                logAction('System Initialized & Secured.', 'System');
            }
        });
    });
}

function logAction(action, username) {
    db.run('INSERT INTO logs (action, username) VALUES (?, ?)', [action, username]);
}

module.exports = {
    db,
    logAction
};
