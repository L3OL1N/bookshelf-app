import express from 'express';
import * as cheerio from 'cheerio';
import db from '../database.js';

const router = express.Router();

// 延遲函數，避免 rate limit
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Google Books API 設定
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

/**
 * 從博客來書籍頁面抓取封面圖片
 * @param {string} bookUrl - 博客來書籍連結
 * @returns {Promise<Object>} 包含 success 和 coverUrl 的結果
 */
async function fetchCoverFromBooksComTw(bookUrl) {
  try {
    console.log(`[博客來] 正在從書籍頁面抓取封面: ${bookUrl}`);

    // 發送請求到書籍頁面
    const response = await fetch(bookUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`博客來請求失敗: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let coverUrl = null;

    coverUrl = $('.cover.M201106_0_getTakelook_P00a400020052_image_wrap').attr('src');

    if (coverUrl) {
      // 確保使用 https
      if (coverUrl.startsWith('//')) {
        coverUrl = 'https:' + coverUrl;
      } else if (coverUrl.startsWith('http:')) {
        coverUrl = coverUrl.replace('http:', 'https:');
      }

      // 如果是相對路徑，補全
      if (!coverUrl.startsWith('http')) {
        coverUrl = 'https://www.books.com.tw' + (coverUrl.startsWith('/') ? '' : '/') + coverUrl;
      }

      console.log(`[博客來] ✓ 成功找到封面: ${coverUrl}`);
      return {
        success: true,
        coverUrl: coverUrl,
        source: 'books.com.tw'
      };
    } else {
      console.log(`[博客來] ✗ 找不到封面圖片`);
      return {
        success: false,
        coverUrl: null,
        error: '在博客來頁面找不到封面圖片'
      };
    }

  } catch (error) {
    console.error(`[博客來] ✗ 錯誤:`, error.message);
    return {
      success: false,
      coverUrl: null,
      error: error.message
    };
  }
}

/**
 * 使用 Google Books API 搜尋書籍封面
 * @param {string} title - 書名
 * @param {string} author - 作者（可選）
 * @returns {Promise<Object>} 包含 success 和 coverUrl 的結果
 */
async function fetchCoverFromGoogleBooks(title, author = '') {
  try {
    console.log(`[Google Books] 正在搜尋封面: ${title}${author ? ` - ${author}` : ''}`);

    // 建立搜尋查詢
    let query = `intitle:${encodeURIComponent(title)}`;
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`;
    }

    // 呼叫 Google Books API
    const url = `${GOOGLE_BOOKS_API}?q=${query}&maxResults=1`;
    console.log(`[Google Books] API 請求: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Books API 錯誤: ${response.status}`);
    }

    const data = await response.json();

    // 檢查是否有找到書籍
    if (!data.items || data.items.length === 0) {
      console.log(`[Google Books] ✗ 找不到書籍: ${title}`);
      return {
        success: false,
        coverUrl: null,
        error: '在 Google Books 找不到該書籍'
      };
    }

    // 取得第一本書的資訊
    const book = data.items[0];
    const imageLinks = book.volumeInfo?.imageLinks;

    // 嘗試取得最高品質的封面圖片
    let coverUrl = null;
    if (imageLinks) {
      // 優先順序: extraLarge > large > medium > small > thumbnail
      coverUrl = imageLinks.extraLarge ||
                 imageLinks.large ||
                 imageLinks.medium ||
                 imageLinks.small ||
                 imageLinks.thumbnail;

      // 將 http 改為 https（Google Books 支援 https）
      if (coverUrl && coverUrl.startsWith('http:')) {
        coverUrl = coverUrl.replace('http:', 'https:');
      }

      // 移除 zoom 參數以取得更高解析度的圖片
      if (coverUrl && coverUrl.includes('zoom=')) {
        coverUrl = coverUrl.replace(/&?zoom=\d+/, '');
      }
    }

    if (coverUrl) {
      console.log(`[Google Books] ✓ 成功找到封面: ${coverUrl}`);
      return {
        success: true,
        coverUrl: coverUrl,
        source: 'Google Books',
        bookInfo: {
          title: book.volumeInfo.title,
          authors: book.volumeInfo.authors,
          publisher: book.volumeInfo.publisher,
          publishedDate: book.volumeInfo.publishedDate
        }
      };
    } else {
      console.log(`[Google Books] ✗ 書籍無封面圖片: ${title}`);
      return {
        success: false,
        coverUrl: null,
        error: '該書籍沒有封面圖片'
      };
    }

  } catch (error) {
    console.error(`[Google Books] ✗ 錯誤 (${title}):`, error.message);
    return {
      success: false,
      coverUrl: null,
      error: error.message
    };
  }
}

/**
 * 雙層抓取策略：先博客來書籍連結，後 Google Books API
 * @param {string} bookUrl - 博客來書籍連結
 * @param {string} title - 書名（用於 Google Books 備用）
 * @param {string} author - 作者（用於 Google Books 備用）
 * @returns {Promise<Object>} 包含 success 和 coverUrl 的結果
 */
async function fetchCoverWithFallback(bookUrl, title, author = '') {
  console.log(`\n========================================`);
  console.log(`📚 開始抓取封面: ${title}${author ? ` - ${author}` : ''}`);
  console.log(`========================================`);

  // 策略 1: 從博客來書籍連結抓取
  if (bookUrl && bookUrl.includes('books.com.tw')) {
    console.log(`\n[策略 1] 從博客來書籍頁面抓取...`);
    const booksComResult = await fetchCoverFromBooksComTw(bookUrl);

    if (booksComResult.success) {
      console.log(`\n✅ 成功！使用博客來的封面`);
      console.log(`========================================\n`);
      return booksComResult;
    }

    console.log(`\n[策略 1] 博客來失敗: ${booksComResult.error}`);
  } else {
    console.log(`\n[策略 1] 跳過博客來（無有效連結）`);
  }

  // 策略 2: 備用方案 - Google Books API
  console.log(`[策略 2] 嘗試從 Google Books API 抓取...`);
  const googleBooksResult = await fetchCoverFromGoogleBooks(title, author);

  if (googleBooksResult.success) {
    console.log(`\n✅ 成功！使用 Google Books 的封面`);
    console.log(`========================================\n`);
    return googleBooksResult;
  }

  console.log(`\n[策略 2] Google Books 失敗: ${googleBooksResult.error}`);
  console.log(`\n❌ 所有策略都失敗了`);
  console.log(`========================================\n`);

  // 兩個策略都失敗
  return {
    success: false,
    coverUrl: null,
    error: `無法找到封面圖片 (Google Books: ${googleBooksResult.error})`
  };
}

/**
 * POST /api/books/:id/fetch-cover
 * 使用雙層策略抓取單一書籍的封面圖片（博客來書籍連結 → Google Books API）
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
    // 檢查是否有書籍連結
    if (!book.books_url) {

      return res.status(400).json({
        success: false,
        error: '該書籍沒有儲存博客來連結，無法抓取封面',
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
        }
      });
    }

    // 2. 使用雙層策略抓取封面（博客來書籍連結 → Google Books API）

    const fetchResult = await fetchCoverWithFallback(book.books_url, book.title, book.author);

    // 3. 更新資料庫
    if (fetchResult.success) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE books SET cover_url = ? WHERE id = ?',
          [fetchResult.coverUrl, id],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // 4. 回傳結果
    if (fetchResult.success) {
      res.json({
        success: true,
        message: '封面圖片抓取成功',
        source: fetchResult.source, // 顯示來源（博客來或 Google Books）
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          cover_url: fetchResult.coverUrl,
        },
        bookInfo: fetchResult.bookInfo
      });
    } else {
      res.json({
        success: false,
        message: '無法找到封面圖片',
        error: fetchResult.error,
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
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
 * 批次使用雙層策略抓取多本書籍的封面圖片（博客來書籍連結 → Google Books API）
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
      skipped: 0,
      sources: {
        'books.com.tw': 0,
        'Google Books': 0
      },
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

        // 檢查是否有書籍連結
        if (!book.books_url) {
          results.books.push({
            id: bookId,
            title: book.title,
            author: book.author,
            success: false,
            skipped: true,
            error: '沒有博客來連結',
          });
          results.skipped++;
          continue;
        }

        // 使用雙層策略抓取封面（博客來書籍連結 → Google Books API）
        const fetchResult = await fetchCoverWithFallback(book.books_url, book.title, book.author);

        // 更新資料庫
        if (fetchResult.success) {
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

          // 統計來源
          if (fetchResult.source) {
            results.sources[fetchResult.source] = (results.sources[fetchResult.source] || 0) + 1;
          }

          results.books.push({
            id: bookId,
            title: book.title,
            author: book.author,
            success: true,
            source: fetchResult.source,
            cover_url: fetchResult.coverUrl,
          });
          results.success++;
        } else {
          results.books.push({
            id: bookId,
            title: book.title,
            author: book.author,
            success: false,
            error: fetchResult.error || '找不到封面圖片',
          });
          results.failed++;
        }

        // 加入延遲避免 rate limit（每本書之間延遲 800ms）
        // 博客來需要較長延遲避免被封鎖
        if (i < bookIds.length - 1) {
          await delay(800);
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
      message: `批次處理完成：成功 ${results.success} 本（博客來 ${results.sources['books.com.tw'] || 0} 本，Google Books ${results.sources['Google Books'] || 0} 本），失敗 ${results.failed} 本，跳過 ${results.skipped} 本`,
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
