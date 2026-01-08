import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database.js';

const router = express.Router();
dotenv.config()

// 測試用，確認有載入
console.log('=== 環境變數檢查 ===');
console.log('API Key 存在:', !!process.env.ANTHROPIC_API_KEY);
console.log('API Key 前綴:', process.env.ANTHROPIC_API_KEY?.substring(0, 15));
console.log('===================');

// 取得當前檔案路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化 Anthropic API 客戶端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 設定 multer 用於處理圖片上傳
// 限制檔案大小為 5MB
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // 只接受圖片檔案
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支援 JPG, PNG, WEBP, GIF 格式的圖片'));
    }
  }
});

// POST /api/books/import-from-image
// 功能：上傳書籍圖片，使用 Claude AI 辨識並批次匯入
router.post('/import-from-image', upload.single('image'), async (req, res) => {
  let filePath = null;

  try {
    // 1. 檢查是否有上傳檔案
    if (!req.file) {
      return res.status(400).json({ error: '請上傳圖片檔案' });
    }

    filePath = req.file.path;
    console.log('圖片已上傳:', filePath);

    // 2. 將圖片轉換為 base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');

    // 3. 判斷圖片的媒體類型
    let mediaType = 'image/jpeg';
    if (req.file.mimetype === 'image/png') {
      mediaType = 'image/png';
    } else if (req.file.mimetype === 'image/webp') {
      mediaType = 'image/webp';
    } else if (req.file.mimetype === 'image/gif') {
      mediaType = 'image/gif';
    }

    console.log('開始呼叫 Claude API 進行圖片辨識...');

    // 4. 呼叫 Claude API 分析圖片
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `請仔細分析這張圖片中的所有書籍。

辨識要求：
1. 找出圖片中所有可見的書籍
2. 盡可能辨識書名、作者和 ISBN（如果可見）
3. 如果書名或作者模糊不清，請根據可見文字做最合理的推測
4. 如果無法確定某些資訊，該欄位可以留空

請以 JSON 格式回傳書籍清單，格式如下：
{
  "books": [
    {
      "title": "書名",
      "author": "作者",
      "isbn": "ISBN碼（如果可見）"
    }
  ]
}

重要：只回傳 JSON，不要有其他說明文字。`,
            },
          ],
        },
      ],
    });

    // 5. 解析 Claude 的回應
    const responseText = message.content[0].text;
    console.log('Claude API 回應:', responseText);

    // 嘗試從回應中提取 JSON
    let booksData;
    try {
      // 移除可能的 markdown 程式碼區塊標記
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      booksData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON 解析失敗:', parseError);
      return res.status(500).json({
        error: 'AI 辨識結果解析失敗',
        details: responseText
      });
    }

    // 檢查是否有辨識到書籍
    if (!booksData.books || booksData.books.length === 0) {
      return res.json({
        message: '圖片中沒有辨識到書籍',
        imported: 0,
        books: []
      });
    }

    console.log(`辨識到 ${booksData.books.length} 本書籍，開始匯入...`);

    // 6. 批次將書籍新增到資料庫
    const importedBooks = [];
    const errors = [];

    for (const book of booksData.books) {
      try {
        // 檢查必要欄位
        if (!book.title || !book.author) {
          errors.push({
            book,
            error: '缺少必要欄位（書名或作者）'
          });
          continue;
        }

        // 插入資料庫
        await new Promise((resolve, reject) => {
          const query = 'INSERT INTO books (title, author, category, url, cover_url) VALUES (?, ?, ?, ?, ?)';
          db.run(
            query,
            [
              book.title,
              book.author,
              '其他', // 預設類別
              book.isbn ? `https://www.google.com/search?q=isbn+${book.isbn}` : null,
              null
            ],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve({
                  id: this.lastID,
                  ...book
                });
              }
            }
          );
        }).then((result) => {
          importedBooks.push(result);
          console.log(`成功匯入: ${book.title}`);
        });
      } catch (err) {
        console.error(`匯入失敗 (${book.title}):`, err);
        errors.push({
          book,
          error: err.message
        });
      }
    }

    // 7. 回傳結果
    res.json({
      message: `成功辨識並匯入 ${importedBooks.length} 本書籍`,
      imported: importedBooks.length,
      total: booksData.books.length,
      books: importedBooks,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('圖片辨識錯誤:', error);

    // 根據錯誤類型回傳不同訊息
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        error: 'API Key 設定錯誤',
        details: '請確認 .env 檔案中的 ANTHROPIC_API_KEY 是否正確'
      });
    }

    res.status(500).json({
      error: '圖片辨識失敗',
      details: error.message
    });

  } finally {
    // 8. 清理：刪除暫存圖片檔案
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('暫存圖片已刪除:', filePath);
      } catch (cleanupError) {
        console.error('刪除暫存檔案失敗:', cleanupError);
      }
    }
  }
});

// 錯誤處理中介軟體：處理 multer 的錯誤
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '檔案大小超過 5MB 限制' });
    }
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

export default router;
