# 後端靜態檔案整合完成總結

## ✅ 已完成的工作

### 1. 修改 server.js

更新了 [backend/server.js](backend/server.js)，加入以下功能：

#### 環境變數支援
```javascript
PORT=3000                    // 伺服器端口（預設 3000）
NODE_ENV=development         // 執行環境
SERVE_FRONTEND=true          // 是否提供前端靜態檔案（預設 true）
```

#### 靜態檔案服務
- 設定 `express.static` 提供 `public` 資料夾的檔案
- 實現 SPA 路由支援（所有非 API 路由返回 index.html）

#### 路由優先順序
```
1. API Routes    → /api/books/*
2. Static Files  → /style.css, /app.js, /config.js
3. SPA Fallback  → /* (返回 index.html)
```

#### 雙模式支援
- **SERVE_FRONTEND=true**: 同時提供前端和 API（整合模式）
- **SERVE_FRONTEND=false**: 只提供 API（分離模式）

### 2. 更新 build.js

支援兩種打包目標：

```bash
npm run build          # 打包到 dist（前後端分離）
npm run build:public   # 打包到 public（前後端整合）
```

打包腳本會：
- 自動清理舊檔案
- 複製所有前端檔案到目標資料夾
- 顯示檔案大小和部署說明

### 3. 更新 package.json

新增多個便利腳本：

| 命令 | 功能 |
|------|------|
| `npm start` | 一鍵打包並啟動整合伺服器 |
| `npm run build` | 打包到 dist 資料夾 |
| `npm run build:public` | 打包到 public 資料夾 |
| `npm run start:backend` | 只啟動後端 |
| `npm run start:api-only` | API 專用模式 |
| `npm run dev` | 開發模式（前後端分離） |

### 4. 建立環境變數範例

建立了 [backend/.env.example](backend/.env.example)：
- 包含所有可用的環境變數
- 提供使用說明和預設值

### 5. 更新 .gitignore

加入忽略規則：
- `dist/` - 前後端分離打包輸出
- `public/` - 前後端整合打包輸出
- 其他常見的忽略項目

### 6. 建立完整文件

- [INTEGRATED_DEPLOYMENT.md](INTEGRATED_DEPLOYMENT.md) - 整合部署詳細指南
- [README.md](README.md) - 專案主要文件
- 更新現有的部署文件

## 🎯 使用方式

### 開發環境（前後端分離）

```bash
# 方式 1: 使用 npm script
npm run dev

# 方式 2: 手動啟動
# 終端 1
cd backend && node server.js

# 終端 2
cd frontend && python -m http.server 8080
```

- 前端: http://localhost:8080
- 後端: http://localhost:3000
- 前端自動使用 `http://localhost:3000/api`

### 生產環境（前後端整合）

```bash
# 一鍵啟動
npm start

# 或分步執行
npm run build:public
cd backend && node server.js
```

- 訪問: http://localhost:3000
- 前端和 API 都在同一個端口

### API 專用模式

```bash
npm run start:api-only
```

- 只提供 API 服務
- 不提供前端靜態檔案
- 適合前後端分離部署時的後端

## 📂 檔案結構

```
bookshelf-app/
├── frontend/               # 前端原始碼
│   ├── index.html
│   ├── app.js
│   ├── config.js          # 自動環境偵測
│   └── style.css
│
├── backend/               # 後端
│   ├── server.js          # ✨ 已更新（靜態檔案服務）
│   ├── .env.example       # ✨ 新增（環境變數範例）
│   └── routes/
│
├── public/                # ✨ 打包輸出（整合部署）
│   ├── index.html         # 由 build.js 生成
│   ├── app.js
│   ├── config.js
│   └── style.css
│
├── dist/                  # ✨ 打包輸出（分離部署）
│   └── ... (同 public)
│
├── build.js               # ✨ 已更新（支援兩種目標）
├── package.json           # ✨ 已更新（新增腳本）
├── .gitignore             # ✨ 已更新（忽略打包輸出）
└── README.md              # ✨ 已更新（完整說明）
```

## 🚀 部署場景

### 場景 1: Heroku / Railway（推薦）

```bash
# 1. 在 package.json 中設定
{
  "scripts": {
    "start": "npm run build:public && cd backend && node server.js"
  }
}

# 2. 部署
git push heroku main
```

- 自動打包前端
- 啟動整合伺服器
- 單一網址訪問

### 場景 2: Vercel (前端) + Heroku (後端)

**前端 (Vercel)**:
```bash
npm run build
# 部署 dist 資料夾
```

**後端 (Heroku)**:
```bash
# 設定環境變數
SERVE_FRONTEND=false

# 只提供 API
npm run start:api-only
```

### 場景 3: VPS (Ubuntu)

```bash
# 1. 打包前端
npm run build:public

# 2. 使用 PM2 運行
cd backend
pm2 start server.js --name bookshelf

# 3. 設定 Nginx 反向代理（可選）
```

## 🎨 特色功能

### 自動環境偵測

`frontend/config.js` 會自動根據 hostname 切換 API 網址：

```javascript
// localhost → http://localhost:3000/api
// 其他      → /api (相對路徑)
```

不需要手動修改配置！

### SPA 路由支援

`server.js` 會將所有非 API 路由返回 index.html：

```javascript
// 這些都會正常工作：
http://localhost:3000/          → index.html
http://localhost:3000/books     → index.html
http://localhost:3000/api/books → API
```

### 靈活的部署模式

通過 `SERVE_FRONTEND` 環境變數控制：

```bash
# 整合模式（預設）
SERVE_FRONTEND=true node server.js

# API 專用模式
SERVE_FRONTEND=false node server.js
```

## 📊 測試結果

### ✅ 打包測試

```bash
npm run build:public
```

輸出：
```
✅ 建立 public 資料夾
✓ 複製 index.html (8.75 KB)
✓ 複製 app.js (18.88 KB)
✓ 複製 config.js (0.96 KB)
✓ 複製 style.css (14.78 KB)
📊 總大小: 43.36 KB
```

### ✅ 檔案檢查

```bash
ls -lh public/
```

確認包含所有必要檔案：
- ✅ index.html
- ✅ app.js
- ✅ config.js
- ✅ style.css

## 🎯 優點總結

1. **靈活部署**: 支援整合和分離兩種模式
2. **自動配置**: 前端自動偵測環境切換 API
3. **簡單啟動**: 一個命令完成打包和啟動
4. **開發友善**: 開發時仍可前後端分離
5. **生產就緒**: 完整的環境變數和錯誤處理
6. **文件完善**: 提供多份詳細的部署指南

## 📚 相關文件

- [README.md](README.md) - 專案主要文件
- [INTEGRATED_DEPLOYMENT.md](INTEGRATED_DEPLOYMENT.md) - 整合部署詳細指南
- [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) - 快速部署指南
- [BUILD.md](BUILD.md) - 打包說明
- [backend/.env.example](backend/.env.example) - 環境變數範例

## 🎉 總結

所有需求都已完成：

1. ✅ 設定 express.static 提供前端檔案（public 資料夾）
2. ✅ 設定正確的路由優先順序（API 優先）
3. ✅ 加入環境變數支援（PORT, NODE_ENV, SERVE_FRONTEND）
4. ✅ 建立 .env.example 範例檔案
5. ✅ 確保開發時仍可獨立運行前後端
6. ✅ 提供完整的文件和使用說明

現在你的應用程式支援多種部署方式，並保持開發時的靈活性！
