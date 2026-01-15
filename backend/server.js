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
  // 提供 CSS, JS, images 等靜態資源
  app.use(express.static(publicPath));

  // SPA Fallback Handler - 使用 middleware 而非路由
  // 這個必須放在所有路由的最後
  // 處理所有未被前面路由匹配的請求
  app.use((req, res, next) => {
    // 只處理 GET 請求
    if (req.method !== 'GET') {
      return next();
    }

    // 跳過 API 路由（讓 Express 繼續往下找對應的 API 處理器）
    if (req.path.startsWith('/api')) {
      return next();
    }

    // 對於所有其他 GET 請求，返回 index.html
    // 這讓 SPA 的前端路由器可以處理路由
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        // 如果找不到 index.html，返回友善的錯誤訊息
        console.error('Failed to send index.html:', err);
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
}

// 404 Handler - 處理所有未被匹配的請求
// 這個必須放在所有路由和 middleware 之後
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

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
