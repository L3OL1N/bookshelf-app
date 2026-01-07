import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/books - 取得所有書籍
router.get('/', (req, res) => {
  const query = 'SELECT * FROM books ORDER BY created_at DESC';

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ books: rows });
  });
});

// GET /api/books/:id - 取得單一書籍
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM books WHERE id = ?';

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ book: row });
  });
});

// POST /api/books - 新增書籍
router.post('/', (req, res) => {
  const { title, author, url, cover_url } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }

  const query = 'INSERT INTO books (title, author, url, cover_url) VALUES (?, ?, ?, ?)';

  db.run(query, [title, author, url || null, cover_url || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Book created successfully',
      book: {
        id: this.lastID,
        title,
        author,
        url,
        cover_url
      }
    });
  });
});

// PUT /api/books/:id - 更新書籍
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, author, url, cover_url } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }

  const query = 'UPDATE books SET title = ?, author = ?, url = ?, cover_url = ? WHERE id = ?';

  db.run(query, [title, author, url || null, cover_url || null, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({
      message: 'Book updated successfully',
      book: {
        id: parseInt(id),
        title,
        author,
        url,
        cover_url
      }
    });
  });
});

// DELETE /api/books/:id - 刪除書籍
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM books WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  });
});

export default router;
