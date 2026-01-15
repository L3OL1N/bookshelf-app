/**
 * 伺服器測試腳本
 * 測試所有路由是否正常運作
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

// 顏色輸出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

// 測試結果統計
const stats = {
  total: 0,
  passed: 0,
  failed: 0
};

// 測試函數
async function testRoute(description, path, method = 'GET', expectedStatus = 200) {
  stats.total++;

  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Accept': 'application/json, text/html, */*'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const passed = res.statusCode === expectedStatus;

        if (passed) {
          stats.passed++;
          console.log(`${colors.green}✓${colors.reset} ${description}`);
          console.log(`  Status: ${res.statusCode}, Path: ${path}`);
        } else {
          stats.failed++;
          console.log(`${colors.red}✗${colors.reset} ${description}`);
          console.log(`  Expected: ${expectedStatus}, Got: ${res.statusCode}`);
          console.log(`  Path: ${path}`);
        }

        resolve(passed);
      });
    });

    req.on('error', (err) => {
      stats.failed++;
      console.log(`${colors.red}✗${colors.reset} ${description}`);
      console.log(`  Error: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

// 主測試函數
async function runTests() {
  console.log(`${colors.blue}=====================================${colors.reset}`);
  console.log(`${colors.blue}📚 書架應用程式伺服器測試${colors.reset}`);
  console.log(`${colors.blue}=====================================${colors.reset}\n`);

  console.log(`${colors.yellow}1️⃣  API 路由測試${colors.reset}`);
  console.log('-------------------------------------');
  await testRoute('取得所有書籍', '/api/books', 'GET', 200);
  console.log();

  console.log(`${colors.yellow}2️⃣  靜態檔案測試${colors.reset}`);
  console.log('-------------------------------------');
  await testRoute('載入 app.js', '/app.js', 'GET', 200);
  await testRoute('載入 style.css', '/style.css', 'GET', 200);
  await testRoute('載入 config.js', '/config.js', 'GET', 200);
  console.log();

  console.log(`${colors.yellow}3️⃣  SPA Fallback 測試${colors.reset}`);
  console.log('-------------------------------------');
  await testRoute('根路徑', '/', 'GET', 200);
  await testRoute('前端路由 /books', '/books', 'GET', 200);
  await testRoute('前端路由 /any/path', '/any/path', 'GET', 200);
  console.log();

  console.log(`${colors.yellow}4️⃣  404 測試${colors.reset}`);
  console.log('-------------------------------------');
  await testRoute('不存在的 API', '/api/nonexistent', 'GET', 404);
  await testRoute('POST 到不存在的路徑', '/nonexistent', 'POST', 404);
  console.log();

  // 顯示結果
  console.log(`${colors.blue}=====================================${colors.reset}`);
  console.log(`${colors.blue}測試結果${colors.reset}`);
  console.log(`${colors.blue}=====================================${colors.reset}`);
  console.log(`總測試數: ${stats.total}`);
  console.log(`${colors.green}通過: ${stats.passed}${colors.reset}`);
  console.log(`${colors.red}失敗: ${stats.failed}${colors.reset}`);

  if (stats.failed === 0) {
    console.log(`\n${colors.green}✅ 所有測試通過！${colors.reset}`);
    console.log(`${colors.green}伺服器運作正常，可以安全部署。${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}❌ 有 ${stats.failed} 個測試失敗${colors.reset}`);
    console.log(`${colors.red}請檢查伺服器設定。${colors.reset}\n`);
  }
}

// 檢查伺服器是否在運行
async function checkServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, () => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 執行測試
console.log('檢查伺服器是否運行中...\n');

checkServer().then(isRunning => {
  if (isRunning) {
    runTests().catch(err => {
      console.error('測試執行錯誤:', err);
      process.exit(1);
    });
  } else {
    console.log(`${colors.red}❌ 伺服器未運行${colors.reset}`);
    console.log(`${colors.yellow}請先啟動伺服器：${colors.reset}`);
    console.log('  cd backend');
    console.log('  node server.js\n');
    process.exit(1);
  }
});
