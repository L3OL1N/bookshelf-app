# 前端打包與部署說明

## 📦 打包步驟

### 1. 執行打包腳本

```bash
npm run build
```

這會將前端檔案複製到 `dist` 資料夾，包含：
- index.html
- app.js
- config.js
- style.css

### 2. 查看打包結果

打包完成後，所有檔案會在 `dist` 資料夾中，可以直接部署到任何靜態網頁伺服器。

## 🌐 環境配置

### config.js 環境偵測

`config.js` 會自動根據執行環境切換 API 網址：

**開發環境** (localhost)
```javascript
API_BASE_URL = 'http://localhost:3000/api'
```

**生產環境** (非 localhost)
```javascript
API_BASE_URL = '/api'  // 使用相對路徑
```

### 自訂 API 網址

如果需要自訂 API 網址，可以修改 `frontend/config.js`：

```javascript
// 方法 1: 使用環境變數（需要在 HTML 中設定）
const API_BASE_URL = window.ENV?.API_URL || '/api';

// 方法 2: 直接指定完整網址
const API_BASE_URL = 'https://your-api-server.com/api';
```

## 🚀 部署方式

### 方式 1: 前後端分離部署

1. **前端部署**
   - 將 `dist` 資料夾中的所有檔案上傳到靜態網頁伺服器
   - 支援的伺服器：Nginx, Apache, Netlify, Vercel, GitHub Pages 等

2. **後端部署**
   - 部署 `backend` 資料夾到 Node.js 伺服器
   - 確保後端可以透過公開網址訪問

3. **修改 CORS 設定**
   - 在 `backend/server.js` 中設定允許的前端網域
   ```javascript
   app.use(cors({
     origin: 'https://your-frontend-domain.com'
   }));
   ```

4. **更新前端 API 網址**
   - 修改 `frontend/config.js` 指向後端網址
   ```javascript
   const API_BASE_URL = 'https://your-backend-domain.com/api';
   ```

### 方式 2: 前後端同域部署（推薦）

將前端和後端部署在同一個伺服器：

1. **後端配置靜態檔案服務**

   在 `backend/server.js` 加入：
   ```javascript
   import path from 'path';
   import { fileURLToPath } from 'url';

   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);

   // 提供前端靜態檔案
   app.use(express.static(path.join(__dirname, '../dist')));

   // 所有非 API 路由都返回 index.html
   app.get('*', (req, res) => {
     if (!req.path.startsWith('/api')) {
       res.sendFile(path.join(__dirname, '../dist/index.html'));
     }
   });
   ```

2. **打包前端**
   ```bash
   npm run build
   ```

3. **啟動伺服器**
   ```bash
   npm run start:backend
   ```

4. **訪問應用程式**
   - 開啟瀏覽器訪問 `http://localhost:3000`
   - API 會自動使用相對路徑 `/api`

## 🧪 測試打包結果

### 本地測試

1. **使用 Node.js http-server**
   ```bash
   cd dist
   npx http-server -p 8080
   ```
   訪問 http://localhost:8080

2. **使用 Python**
   ```bash
   cd dist
   python -m http.server 8080
   ```
   訪問 http://localhost:8080

3. **確保後端正在運行**
   ```bash
   npm run start:backend
   ```

## 📝 部署檢查清單

- [ ] 執行 `npm run build` 打包前端
- [ ] 確認 `dist` 資料夾包含所有必要檔案
- [ ] 檢查 `config.js` 中的 API 網址設定
- [ ] 測試打包後的檔案能正常運行
- [ ] 確認後端 CORS 設定正確
- [ ] 檢查 API 端點可以正常訪問
- [ ] 測試所有功能（新增、編輯、刪除、AI 匯入、封面抓取）

## 🔧 常見問題

### API 請求失敗

**問題**: 前端無法連接到後端 API

**解決方案**:
1. 檢查 `config.js` 中的 API_BASE_URL 是否正確
2. 確認後端伺服器正在運行
3. 檢查瀏覽器 Console 中的錯誤訊息
4. 確認 CORS 設定允許前端網域

### 圖片無法顯示

**問題**: 書籍封面圖片無法載入

**解決方案**:
1. 確認圖片 URL 可以公開訪問
2. 檢查 CSP (Content Security Policy) 設定
3. 確認圖片來源允許跨域載入

### 部署後 404 錯誤

**問題**: 刷新頁面時出現 404

**解決方案**:
1. 配置伺服器將所有路由指向 index.html
2. 或者在後端加入 catch-all 路由

## 🌟 生產環境優化建議

1. **程式碼壓縮**
   - 使用工具如 Terser 壓縮 JavaScript
   - 使用 cssnano 壓縮 CSS

2. **快取策略**
   - 設定靜態檔案的 Cache-Control headers
   - 使用版本號或 hash 避免快取問題

3. **HTTPS**
   - 生產環境務必使用 HTTPS
   - 可使用 Let's Encrypt 免費憑證

4. **環境變數**
   - 敏感資訊使用環境變數管理
   - 不要將 API keys 硬編碼在前端

5. **監控與日誌**
   - 加入錯誤追蹤（如 Sentry）
   - 設定伺服器日誌記錄
