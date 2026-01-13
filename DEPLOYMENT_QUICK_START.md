# 快速部署指南

## 🚀 快速開始

### 開發環境

```bash
# 1. 安裝後端依賴
cd backend
npm install

# 2. 啟動後端（端口 3000）
node server.js

# 3. 在另一個終端，啟動前端（端口 8080）
cd frontend
python -m http.server 8080
# 或使用 npx http-server -p 8080
```

訪問 http://localhost:8080

### 生產環境打包

```bash
# 執行打包腳本
npm run build

# 打包結果會在 dist 資料夾
```

## 📁 專案結構

```
bookshelf-app/
├── frontend/          # 前端原始碼
│   ├── index.html     # 主頁面
│   ├── app.js         # 應用程式邏輯
│   ├── config.js      # 環境配置（自動切換 API）
│   └── style.css      # 樣式
├── backend/           # 後端 API
│   ├── server.js      # 伺服器主程式
│   ├── database.js    # 資料庫設定
│   └── routes/        # API 路由
├── dist/              # 打包輸出（執行 npm run build 後產生）
└── build.js           # 打包腳本
```

## 🌐 環境配置說明

### config.js 自動環境偵測

前端會自動偵測執行環境並切換 API 網址：

| 環境 | 判斷條件 | API 網址 |
|------|----------|----------|
| 開發 | hostname = localhost 或 127.0.0.1 | `http://localhost:3000/api` |
| 生產 | hostname ≠ localhost | `/api` (相對路徑) |

**不需要手動修改配置檔！** 系統會自動根據執行環境切換。

### 如果需要自訂 API 網址

編輯 `frontend/config.js`:

```javascript
// 指定固定的 API 網址
const API_BASE_URL = 'https://your-api-server.com/api';
```

## 📦 部署方式選擇

### 方式 A: 前後端同域部署（最簡單）

**適合**: Heroku, Railway, Render 等平台

1. 修改 `backend/server.js` 加入靜態檔案服務:

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ... 其他設定 ...

// 提供前端靜態檔案
app.use(express.static(path.join(__dirname, '../dist')));

// API 路由
app.use('/api/books', booksRouter);

// 所有非 API 路由都返回 index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

app.listen(3000);
```

2. 打包前端:
```bash
npm run build
```

3. 啟動伺服器:
```bash
cd backend
node server.js
```

4. 訪問 http://localhost:3000（前端和後端都在同一個端口）

### 方式 B: 前後端分離部署

**適合**: Vercel/Netlify (前端) + Heroku/Railway (後端)

1. **部署後端** 到 Heroku/Railway 等平台
   - 記下後端網址，例如: `https://your-app.herokuapp.com`

2. **修改前端配置** `frontend/config.js`:
```javascript
const API_BASE_URL = 'https://your-app.herokuapp.com/api';
```

3. **部署前端** 到 Vercel/Netlify
   - 上傳 `dist` 資料夾內容

4. **設定後端 CORS** 在 `backend/server.js`:
```javascript
app.use(cors({
  origin: 'https://your-frontend.vercel.app'
}));
```

## ✅ 部署檢查清單

開始部署前請確認：

- [ ] 執行 `npm run build` 成功
- [ ] `dist` 資料夾包含 4 個檔案（index.html, app.js, config.js, style.css）
- [ ] 本地測試前端可以正常運行
- [ ] 本地測試後端可以正常運行
- [ ] 確認 API 端點可以訪問
- [ ] 測試所有功能正常（新增、編輯、刪除書籍）
- [ ] 測試 AI 匯入功能
- [ ] 測試封面抓取功能

## 🧪 本地測試打包結果

```bash
# 啟動後端
cd backend
node server.js

# 在另一個終端，測試打包後的前端
cd dist
npx http-server -p 8080
```

訪問 http://localhost:8080，確認所有功能正常。

## 🔧 常見問題

### Q1: 前端無法連接到後端 API

**檢查項目**:
1. 確認後端正在運行
2. 檢查瀏覽器 Console 的錯誤訊息
3. 確認 `config.js` 中的 API_BASE_URL 正確
4. 檢查 CORS 設定

### Q2: 打包後圖片或樣式不顯示

**解決方法**:
- 確認所有資源使用相對路徑
- 檢查 Console 是否有 404 錯誤

### Q3: Playwright 在生產環境無法運行

**解決方法**:
- 確保生產環境有安裝 Chromium 依賴
- 或考慮改用無頭瀏覽器服務（如 Browserless）

## 📚 更多資訊

詳細部署說明請參考 [BUILD.md](BUILD.md)
