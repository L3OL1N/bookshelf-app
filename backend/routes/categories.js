import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/categories - 取得所有分類
router.get('/', (req, res) => {
  // 使用 CASE 讓"其他"排在最後，其他分類按名稱排序
  const query = `
    SELECT * FROM categories
    ORDER BY
      CASE WHEN name = '其他' THEN 1 ELSE 0 END,
      name
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/categories - 新增分類
router.post('/', (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const query = 'INSERT INTO categories (name) VALUES (?)';

  db.run(query, [name.trim()], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Category already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Category created successfully',
      category: {
        id: this.lastID,
        name: name.trim()
      }
    });
  });
});

// DELETE /api/categories/:id - 刪除分類（僅當該分類沒有書籍時）
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // 首先檢查該分類是否有書籍
  const checkQuery = 'SELECT COUNT(*) as count FROM books WHERE category = (SELECT name FROM categories WHERE id = ?)';

  db.get(checkQuery, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (row.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with existing books',
        bookCount: row.count
      });
    }

    // 如果沒有書籍，則刪除分類
    const deleteQuery = 'DELETE FROM categories WHERE id = ?';

    db.run(deleteQuery, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json({
        message: 'Category deleted successfully'
      });
    });
  });
});

// DELETE /api/categories/cleanup - 清理所有沒有書籍的分類
router.delete('/cleanup/unused', (_req, res) => {
  // 刪除所有沒有書籍的分類（保留預設的"其他"分類）
  const deleteQuery = `
    DELETE FROM categories
    WHERE id IN (
      SELECT c.id
      FROM categories c
      LEFT JOIN books b ON c.name = b.category
      WHERE b.id IS NULL AND c.name != '其他'
    )
  `;

  db.run(deleteQuery, [], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: 'Unused categories cleaned up successfully',
      deletedCount: this.changes
    });
  });
});

export default router;
