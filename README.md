# 📚 書架應用程式 (Bookshelf App)

一個優雅的書籍管理系統，支援 AI 智慧匯入、封面自動抓取等功能。

## ✨ 功能特色

- 📖 **書籍管理**: 新增、編輯、刪除書籍資料
- 🤖 **AI 智慧匯入**: 上傳書籍照片，AI 自動辨識書名和作者
- 🖼️ **封面自動抓取**: 使用 Playwright 從購買連結抓取封面圖片
- 🏷️ **分類管理**: 支援多種書籍分類（小說、散文、詩集等）
- 🎨 **優雅介面**: 現代化的卡片式設計

## 🚀 快速開始

### 前置需求

- Node.js 18+
- npm 或 yarn

### 安裝

```bash
# 1. 克隆專案
git clone <repository-url>
cd bookshelf-app

# 2. 安裝後端依賴
cd backend
npm install

# 3. 返回根目錄
cd ..
```

### 運行

#### 方式 1: 前後端整合（單一伺服器）

```bash
# 打包並啟動（推薦用於生產環境）
npm start

# 訪問 http://localhost:3000
```

#### 方式 2: 開發模式（前後端分離）

```bash
# 同時啟動前後端開發伺服器
npm run dev

# 前端: http://localhost:8080
# 後端: http://localhost:3000
```

#### 方式 3: 手動啟動

```bash
# 啟動後端
npm run start:backend

# 在另一個終端啟動前端
npm run start:frontend
```

## 📦 打包部署

### 前後端整合部署

```bash
# 打包前端到 public 資料夾
npm run build:public

# 啟動後端（自動提供前端）
cd backend
node server.js
```

### 前後端分離部署

```bash
# 打包前端到 dist 資料夾
npm run build

# 將 dist 內容部署到靜態伺服器（Vercel, Netlify 等）
# 將 backend 部署到 Node.js 伺服器（Heroku, Railway 等）
```

## 📝 可用命令

| 命令 | 說明 |
|------|------|
| `npm start` | 打包前端並啟動整合伺服器 |
| `npm run dev` | 開發模式（前後端分離） |
| `npm run build` | 打包前端到 dist 資料夾 |
| `npm run build:public` | 打包前端到 public 資料夾 |
| `npm run start:backend` | 只啟動後端 |
| `npm run start:frontend` | 只啟動前端 |
| `npm run start:api-only` | 只啟動 API（不提供前端） |

## 🌐 環境變數

建立 `backend/.env` 檔案（參考 `backend/.env.example`）：

```env
# 伺服器端口
PORT=3000

# 執行環境
NODE_ENV=development

# 是否提供前端靜態檔案
SERVE_FRONTEND=true
```

## 🗂️ 專案結構

```
bookshelf-app/
├── frontend/              # 前端原始碼
│   ├── index.html         # 主頁面
│   ├── app.js            # 應用程式邏輯
│   ├── config.js         # 環境配置（自動切換 API）
│   └── style.css         # 樣式
│
├── backend/              # 後端 API
│   ├── server.js         # 伺服器主程式
│   ├── database.js       # 資料庫設定
│   └── routes/           # API 路由
│       ├── books.js      # 書籍 CRUD
│       ├── imageImport.js # AI 匯入
│       └── coverFetch.js  # 封面抓取（Playwright）
│
├── public/               # 打包輸出（整合部署）
├── dist/                 # 打包輸出（分離部署）
├── build.js             # 打包腳本
└── package.json         # 專案配置
```

## 🔧 技術棧

### 前端
- 純 JavaScript（無框架）
- CSS3（現代化設計）
- 自動環境偵測配置

### 後端
- Node.js + Express
- SQLite 資料庫
- Playwright（網頁爬蟲）
- Anthropic Claude API（AI 功能）

## 📖 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/books` | GET | 取得所有書籍 |
| `/api/books` | POST | 新增書籍 |
| `/api/books/:id` | GET | 取得單一書籍 |
| `/api/books/:id` | PUT | 更新書籍 |
| `/api/books/:id` | DELETE | 刪除書籍 |
| `/api/books/import-from-image` | POST | AI 匯入書籍 |
| `/api/books/:id/fetch-cover` | POST | 抓取單一書籍封面 |
| `/api/books/batch-fetch-covers` | POST | 批次抓取封面 |

## 📚 部署指南

- [快速部署指南](DEPLOYMENT_QUICK_START.md) - 快速開始部署
- [整合部署指南](INTEGRATED_DEPLOYMENT.md) - 前後端整合部署詳解
- [打包說明](BUILD.md) - 詳細的打包與配置說明

## 🎯 功能說明

### AI 智慧匯入

1. 點擊「AI 匯入」按鈕
2. 上傳書籍照片（最多 5MB）
3. AI 自動辨識書名、作者、購買連結
4. 自動批次抓取封面圖片

### 封面自動抓取

- 支援誠品線上、博客來等書籍網站
- 使用真實瀏覽器（Playwright）抓取動態網頁
- 自動處理相對路徑和絕對路徑

## 🤝 開發

### 開發環境設定

```bash
# 1. 啟動後端（端口 3000）
cd backend
node server.js

# 2. 啟動前端（端口 8080）
cd frontend
python -m http.server 8080
# 或使用 npx http-server -p 8080
```

前端會自動偵測開發環境並使用 `http://localhost:3000/api`

### 修改前端

1. 編輯 `frontend/` 中的檔案
2. 重新整理瀏覽器即可看到變更

### 修改後端

1. 編輯 `backend/` 中的檔案
2. 重新啟動後端伺服器

## 📄 授權

MIT License

## 🙏 致謝

- [Anthropic Claude](https://www.anthropic.com/) - AI 功能
- [Playwright](https://playwright.dev/) - 網頁自動化
- [Express](https://expressjs.com/) - 後端框架