import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, 'bookshelf.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

const initializeDatabase = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT DEFAULT '其他',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      url TEXT,
      cover_url TEXT
    )
  `;

  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Books table ready');
      // Add category column to existing tables if it doesn't exist
      db.run('ALTER TABLE books ADD COLUMN category TEXT DEFAULT "其他"', (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Note: Category column may already exist');
        }
      });
    }
  });
};

export default db;
