import express from 'express';
import { chromium } from 'playwright';
import db from '../database.js';

const router = express.Router();

// 延遲函數，避免 rate limit
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 瀏覽器實例池（重用瀏覽器以提升效能）
let browserInstance = null;

/**
 * 取得瀏覽器實例（重用機制）
 */
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

/**
 * 使用 Playwright 從購買頁面抓取封面圖片
 */
async function fetchCoverFromUrl(bookLink, bookTitle) {
  let page = null;

  try {
    console.log(`正在抓取封面: ${bookTitle} - ${bookLink}`);

    // 取得瀏覽器實例
    const browser = await getBrowser();
    page = await browser.newPage();

    // 設置 User-Agent 和 viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    console.log('等待30000');
    // 前往目標頁面，等待載入完成
    await page.goto(bookLink, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('等待20000');
    // 等待頁面完全載入
    await page.waitForTimeout(20000);

    let coverUrl = null;

    // 根據不同網站使用不同的選擇器
    if (bookLink.includes('eslite.com')) {
      // 誠品線上 - 依序嘗試不同選擇器
      coverUrl = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null) ||
                 await page.locator('.box_detail_prod figure img').first().getAttribute('src').catch(() => null) ||
                 await page.locator('.eslite-figure img').first().getAttribute('src').catch(() => null) ||
                 await page.locator('img[alt*="封面"]').first().getAttribute('src').catch(() => null);
    } else if (bookLink.includes('books.com.tw')) {
      // 博客來
      coverUrl = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null) ||
                 await page.locator('.cover img').first().getAttribute('src').catch(() => null) ||
                 await page.locator('#upload_pic').getAttribute('src').catch(() => null) ||
                 await page.locator('img[itemprop="image"]').first().getAttribute('src').catch(() => null);
    } else {
      // 通用選擇器（適用於大多數網站）
      coverUrl = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null) ||
                 await page.locator('meta[name="twitter:image"]').getAttribute('content').catch(() => null) ||
                 await page.locator('img[alt*="封面"]').first().getAttribute('src').catch(() => null) ||
                 await page.locator('.product-image img').first().getAttribute('src').catch(() => null) ||
                 await page.locator('.book-cover img').first().getAttribute('src').catch(() => null) ||
                 await page.locator('img').first().getAttribute('src').catch(() => null);
    }

    // 處理相對 URL
    if (coverUrl && !coverUrl.startsWith('http')) {
      const url = new URL(bookLink);
      if (coverUrl.startsWith('//')) {
        coverUrl = url.protocol + coverUrl;
      } else if (coverUrl.startsWith('/')) {
        coverUrl = url.origin + coverUrl;
      } else {
        coverUrl = url.origin + '/' + coverUrl;
      }
    }

    // 驗證 URL
    if (coverUrl && (coverUrl.startsWith('http://') || coverUrl.startsWith('https://'))) {
      console.log(`成功找到封面: ${coverUrl}`);
      return {
        success: true,
        coverUrl: coverUrl,
      };
    } else {
      throw new Error('找不到有效的封面圖片 URL');
    }

  } catch (error) {
    console.error(`抓取封面失敗 (${bookTitle}):`, error.message);
    return {
      success: false,
      coverUrl: null,
      error: error.message,
    };
  } finally {
    // 關閉頁面
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * POST /api/books/:id/fetch-cover
 * 抓取單一書籍的封面圖片
 */
router.post('/:id/fetch-cover', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. 從資料庫取得書籍資訊
    const book = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM books WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!book) {
      return res.status(404).json({ error: '找不到該書籍' });
    }

    if (!book.url) {
      return res.status(400).json({ error: '該書籍沒有購買連結' });
    }

    // 2. 使用 Playwright 抓取封面
    const fetchResult = await fetchCoverFromUrl(book.url, book.title);

    // 3. 更新資料庫
    const updateQuery = 'UPDATE books SET cover_url = ? WHERE id = ?';

    await new Promise((resolve, reject) => {
      db.run(
        updateQuery,
        [fetchResult.coverUrl, id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 4. 回傳結果
    if (fetchResult.success) {
      res.json({
        success: true,
        message: '封面圖片抓取成功',
        book: {
          id: book.id,
          title: book.title,
          cover_url: fetchResult.coverUrl,
        },
      });
    } else {
      res.json({
        success: false,
        message: '無法找到封面圖片',
        error: fetchResult.error,
        book: {
          id: book.id,
          title: book.title,
        },
      });
    }

  } catch (error) {
    console.error('抓取封面錯誤:', error);
    res.status(500).json({
      error: '抓取封面失敗',
      details: error.message,
    });
  }
});

/**
 * POST /api/books/batch-fetch-covers
 * 批次抓取多本書籍的封面圖片
 */
router.post('/batch-fetch-covers', async (req, res) => {
  const { bookIds } = req.body;

  if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
    return res.status(400).json({ error: '請提供書籍 ID 陣列' });
  }

  try {
    const results = {
      total: bookIds.length,
      success: 0,
      failed: 0,
      books: [],
    };

    // 逐一處理每本書
    for (let i = 0; i < bookIds.length; i++) {
      const bookId = bookIds[i];

      try {
        // 從資料庫取得書籍資訊
        const book = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (!book) {
          results.books.push({
            id: bookId,
            success: false,
            error: '找不到該書籍',
          });
          results.failed++;
          continue;
        }

        if (!book.url) {
          results.books.push({
            id: bookId,
            title: book.title,
            success: false,
            error: '沒有購買連結',
          });
          results.failed++;
          continue;
        }

        // 抓取封面
        const fetchResult = await fetchCoverFromUrl(book.url, book.title);

        // 更新資料庫
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE books SET cover_url = ? WHERE id = ?',
            [fetchResult.coverUrl, bookId],
            function (err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        if (fetchResult.success) {
          results.books.push({
            id: bookId,
            title: book.title,
            success: true,
            cover_url: fetchResult.coverUrl,
          });
          results.success++;
        } else {
          results.books.push({
            id: bookId,
            title: book.title,
            success: false,
            error: fetchResult.error || '找不到封面圖片',
          });
          results.failed++;
        }

        // 加入延遲避免 rate limit（每本書之間延遲 2 秒）
        if (i < bookIds.length - 1) {
          await delay(2000);
        }

      } catch (error) {
        console.error(`處理書籍 ${bookId} 時發生錯誤:`, error);
        results.books.push({
          id: bookId,
          success: false,
          error: error.message,
        });
        results.failed++;
      }
    }

    // 回傳結果
    res.json({
      message: `批次處理完成：成功 ${results.success} 本，失敗 ${results.failed} 本`,
      ...results,
    });

  } catch (error) {
    console.error('批次抓取封面錯誤:', error);
    res.status(500).json({
      error: '批次抓取失敗',
      details: error.message,
    });
  }
});

export default router;
