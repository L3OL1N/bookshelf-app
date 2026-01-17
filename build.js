/**
 * 前端打包腳本
 * 支援兩種打包模式：
 * - npm run build:public -> 打包到 public 資料夾（前後端整合部署）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'frontend');

// 根據命令參數決定輸出目錄
const buildTarget = process.argv[2] || 'public'; // 'dist' 或 'public'
const targetDir = path.join(__dirname, buildTarget);

// 需要複製的檔案
const filesToCopy = [
  'index.html',
  'app.js',
  'config.js',
  'style.css'
];

console.log(`📦 開始打包前端檔案到 ${buildTarget} 資料夾...\n`);
// 建立目標資料夾
if (fs.existsSync(targetDir)) {
  console.log(`🗑️  清理舊的 ${buildTarget} 資料夾...`);
  fs.rmSync(targetDir, { recursive: true });
}
fs.mkdirSync(targetDir, { recursive: true });
console.log(`✅ 建立 ${buildTarget} 資料夾\n`);

// 複製檔案
let totalSize = 0;
filesToCopy.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    const stats = fs.statSync(sourcePath);
    totalSize += stats.size;
    console.log(`✓ 複製 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log(`⚠️  找不到檔案: ${file}`);
  }
});

console.log('\n✅ 打包完成！\n');
console.log('📁 打包檔案位置:', targetDir);
console.log(`📊 總大小: ${(totalSize / 1024).toFixed(2)} KB\n`);

// 根據不同的打包目標顯示不同的說明
if (buildTarget === 'public') {
  console.log('📝 前後端整合部署:');
  console.log('   1. 前端檔案已打包到 public 資料夾');
  console.log('   2. 直接啟動後端即可同時提供前後端服務:');
  console.log('      cd backend && node server.js');
  console.log('   3. 訪問 http://localhost:3000\n');
} 
