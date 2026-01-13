import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import booksRouter from './routes/books.js';
import imageImportRouter from './routes/imageImport.js';
import coverFetchRouter from './routes/coverFetch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 環境變數
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVE_FRONTEND = process.env.SERVE_FRONTEND !== 'false'; // 預設啟用前端服務

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes (必須在靜態檔案之前)
app.use('/api/books', booksRouter);
app.use('/api/books', imageImportRouter);
app.use('/api/books', coverFetchRouter);

// 提供前端靜態檔案（可選）
if (SERVE_FRONTEND) {
  const publicPath = path.join(__dirname, '../public');

  // 靜態檔案服務
  app.use(express.static(publicPath));

  // SPA 支援 - 所有非 API 路由都返回 index.html
  app.get('*', (req, res, next) => {
    // 如果是 API 路由，跳過
    if (req.path.startsWith('/api')) {
      return next();
    }

    // 返回 index.html
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
      if (err) {
        // 如果找不到 index.html，返回提示訊息
        res.status(404).json({
          error: 'Frontend files not found',
          message: 'Please run "npm run build:public" to build frontend files'
        });
      }
    });
  });
} else {
  // 只提供 API，不提供前端
  app.get('/', (_req, res) => {
    res.json({
      message: 'Welcome to Bookshelf API',
      version: '1.0.0',
      endpoints: {
        books: '/api/books',
        importFromImage: '/api/books/import-from-image',
        batchFetchCovers: '/api/books/batch-fetch-covers',
        fetchCover: '/api/books/:id/fetch-cover'
      }
    });
  });

  // 404 handler for API-only mode
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────┐
│  📚 Bookshelf Server                    │
├─────────────────────────────────────────┤
│  Environment: ${NODE_ENV.padEnd(27)}│
│  Port:        ${PORT.toString().padEnd(27)}│
│  Frontend:    ${(SERVE_FRONTEND ? 'Enabled' : 'Disabled').padEnd(27)}│
├─────────────────────────────────────────┤
│  ${SERVE_FRONTEND ? `🌐 http://localhost:${PORT}` : `🔌 API: http://localhost:${PORT}/api`}           │
└─────────────────────────────────────────┘
  `);
});
