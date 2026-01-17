/**
 * 前端環境配置
 * 根據執行環境自動切換 API 網址
 */

// 偵測執行環境
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// 開發環境：使用完整的 localhost URL
// 生產環境：使用相對路徑（假設前後端部署在同一個域名下）
const API_BASE_URL = isProduction
  ? '/api'  // 生產環境使用相對路徑
  : 'http://localhost:3000/api';  // 開發環境使用完整 URL

// 匯出配置
const config = {
  API_BASE_URL,
  API_ENDPOINTS: {
    books: `${API_BASE_URL}/books`,
    categories: `${API_BASE_URL}/categories`,
    importFromImage: `${API_BASE_URL}/books/import-from-image`,
    batchFetchCovers: `${API_BASE_URL}/books/batch-fetch-covers`,
    fetchCover: (id) => `${API_BASE_URL}/books/${id}/fetch-cover`,
  },
  isProduction
};

// 在開發環境顯示配置資訊
if (!isProduction) {
  console.log('📦 環境配置:', {
    environment: '開發環境',
    apiBaseUrl: config.API_BASE_URL
  });
}
