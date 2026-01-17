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
  const createBooksTableQuery = `
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT DEFAULT '其他',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      url TEXT,
      cover_url TEXT,
      books_url TEXT
    )
  `;

  const createCategoriesTableQuery = `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(createBooksTableQuery, (err) => {
    if (err) {
      console.error('Error creating books table:', err.message);
    } else {
      console.log('Books table ready');
      // Add category column to existing tables if it doesn't exist
      db.run('ALTER TABLE books ADD COLUMN category TEXT DEFAULT "其他"', (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Note: Category column may already exist');
        }
      });
      // Add books_url column to existing tables if it doesn't exist
      db.run('ALTER TABLE books ADD COLUMN books_url TEXT', (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Note: books_url column may already exist');
        }
      });
    }
  });

  db.run(createCategoriesTableQuery, (err) => {
    if (err) {
      console.error('Error creating categories table:', err.message);
    } else {
      console.log('Categories table ready');
      // Insert default categories
      const defaultCategories = ['小說', '散文', '詩集', '科技', '商業', '自我成長', '歷史', '藝術', '其他'];
      const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');

      defaultCategories.forEach(category => {
        insertCategory.run(category, (insertErr) => {
          if (insertErr) {
            console.error(`Error inserting category ${category}:`, insertErr.message);
          }
        });
      });

      insertCategory.finalize();
      console.log('Default categories initialized');
    }
  });
};

export default db;
