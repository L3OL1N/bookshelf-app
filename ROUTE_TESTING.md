# 路由測試指南

## 路由配置說明

### 修改內容

將 `app.get('*', ...)` 改為 `app.get('/*', ...)`

**原因**:
- 新版 Express 和 path-to-regexp 不再支援 `'*'` 作為路由模式
- `'/*'` 是正確的萬用字元路由語法，符合 Express 5.x 規範

### 路由優先順序

伺服器按照以下順序處理請求：

```
1. API Routes          → /api/books/*
2. Static Files        → /style.css, /app.js, /config.js, /images/*
3. SPA Fallback        → /* (所有其他路由返回 index.html)
```

## 測試清單

### 1. API 路由測試

測試所有 API 端點是否正常運作：

```bash
# 測試取得所有書籍
curl http://localhost:3000/api/books

# 測試取得單一書籍
curl http://localhost:3000/api/books/1

# 測試 POST（需要 JSON body）
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"測試書籍","author":"測試作者","category":"其他"}'

# 測試 AI 匯入端點（確認存在）
curl -X POST http://localhost:3000/api/books/import-from-image

# 測試封面抓取端點
curl -X POST http://localhost:3000/api/books/1/fetch-cover

# 測試批次封面抓取
curl -X POST http://localhost:3000/api/books/batch-fetch-covers \
  -H "Content-Type: application/json" \
  -d '{"bookIds":[1,2,3]}'
```

預期結果：所有 API 端點都應該返回 JSON 響應（200 或 4xx/5xx 狀態碼）

### 2. 靜態檔案測試

測試靜態資源是否能正確載入：

```bash
# 測試 HTML
curl http://localhost:3000/
# 預期：返回 index.html 內容

# 測試 JavaScript
curl http://localhost:3000/app.js
# 預期：返回 JavaScript 檔案內容

# 測試 CSS
curl http://localhost:3000/style.css
# 預期：返回 CSS 檔案內容

# 測試 config.js
curl http://localhost:3000/config.js
# 預期：返回 config.js 內容
```

預期結果：所有檔案都應該正確返回內容

### 3. SPA Fallback 測試

測試 SPA 路由是否正確 fallback 到 index.html：

```bash
# 測試根路徑
curl http://localhost:3000/
# 預期：返回 index.html

# 測試任意前端路由
curl http://localhost:3000/books
# 預期：返回 index.html

curl http://localhost:3000/books/123
# 預期：返回 index.html

curl http://localhost:3000/some/random/path
# 預期：返回 index.html

# 測試不存在的 API 路由（應該 404）
curl http://localhost:3000/api/nonexistent
# 預期：返回 JSON 404 錯誤
```

預期結果：
- 非 API 路由 → 返回 index.html
- 不存在的 API 路由 → 返回 JSON 錯誤

### 4. 瀏覽器測試

在瀏覽器中測試：

1. **訪問主頁**
   ```
   http://localhost:3000/
   ```
   預期：顯示書架應用程式介面

2. **測試 API 呼叫**
   - 開啟瀏覽器開發者工具 (F12)
   - 切換到 Network 標籤
   - 重新整理頁面
   - 檢查 `/api/books` 請求是否成功

3. **測試靜態資源載入**
   - 檢查 Network 標籤
   - 確認 `app.js`, `style.css`, `config.js` 都成功載入（200 狀態碼）

4. **測試 SPA 路由（如果有）**
   - 手動在網址列輸入不存在的路徑，如 `http://localhost:3000/test`
   - 預期：仍然顯示主應用程式（不是 404 頁面）

5. **測試功能**
   - 新增書籍
   - 編輯書籍
   - 刪除書籍
   - AI 匯入（如果已設定 API key）
   - 封面抓取

## 常見問題排查

### 問題 1: API 返回 HTML 而非 JSON

**症狀**: API 請求返回 index.html 內容

**原因**: SPA fallback 誤攔截了 API 請求

**檢查**:
```javascript
// 確認 API routes 在 SPA fallback 之前
app.use('/api/books', booksRouter);  // ✅ 在前
app.get('/*', ...)                   // ✅ 在後
```

**解決**: 確保 API routes 定義在 SPA fallback 之前

### 問題 2: 靜態檔案 404

**症狀**: CSS/JS 檔案無法載入

**原因**:
1. 檔案不在 public 資料夾
2. express.static 配置錯誤

**檢查**:
```bash
# 確認 public 資料夾存在且有檔案
ls -la public/

# 確認伺服器設定
app.use(express.static(publicPath));  # ✅ 正確
```

**解決**: 執行 `npm run build:public` 打包前端檔案

### 問題 3: SPA 路由 404

**症狀**: 刷新頁面時出現 404

**原因**: 沒有設定 SPA fallback 或配置錯誤

**檢查**:
```javascript
// 確認有 SPA fallback
app.get('/*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});
```

**解決**: 確認 server.js 中有正確的 SPA fallback 配置

### 問題 4: 路由警告訊息

**症狀**: 啟動時看到 `app.get('*')` 相關警告

**原因**: 使用了舊版不支援的萬用字元語法

**解決**: 已修改為 `app.get('/*')`，符合新版規範

## 測試腳本

建立 `test-routes.sh` 快速測試所有路由：

```bash
#!/bin/bash

echo "Testing Bookshelf API Routes..."
echo "================================"

# 測試 API
echo "\n1. Testing API routes..."
curl -s http://localhost:3000/api/books | head -n 5

# 測試靜態檔案
echo "\n2. Testing static files..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app.js
echo " - app.js"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/style.css
echo " - style.css"

# 測試 SPA fallback
echo "\n3. Testing SPA fallback..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
echo " - root path"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/books
echo " - /books"

echo "\n================================"
echo "Testing complete!"
```

## 成功標準

所有測試通過的標準：

- ✅ 所有 API 端點返回 JSON
- ✅ 靜態檔案正確載入（200 狀態碼）
- ✅ SPA fallback 正常工作（非 API 路由返回 index.html）
- ✅ 瀏覽器中應用程式正常運作
- ✅ 無路由相關的錯誤或警告訊息
- ✅ 所有功能（新增、編輯、刪除、AI 匯入、封面抓取）正常

## 效能考量

### 路由順序的重要性

```javascript
// ✅ 正確順序（高效）
app.use('/api/books', ...)     // 1. API routes (最常用)
app.use(express.static(...))   // 2. 靜態檔案
app.get('/*', ...)              // 3. SPA fallback (最後)

// ❌ 錯誤順序（低效）
app.get('/*', ...)              // 每個請求都要檢查
app.use('/api/books', ...)     // API 永遠不會被執行
```

### 靜態檔案快取

建議在生產環境加入快取標頭：

```javascript
app.use(express.static(publicPath, {
  maxAge: '1d',           // 快取 1 天
  etag: true,             // 啟用 ETag
  lastModified: true      // 啟用 Last-Modified
}));
```

## 參考資料

- [Express 路由文件](https://expressjs.com/en/guide/routing.html)
- [path-to-regexp 變更](https://github.com/pillarjs/path-to-regexp/blob/master/History.md)
- [SPA 部署最佳實踐](https://create-react-app.dev/docs/deployment/)
