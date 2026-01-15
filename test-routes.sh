#!/bin/bash

# 測試書架應用程式的路由配置
# 確保伺服器正在運行（npm run start:backend）

echo "======================================"
echo "📚 書架應用程式路由測試"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000"

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試函數
test_route() {
    local url=$1
    local description=$2
    local expected_type=$3  # json, html, css, js

    echo -n "Testing $description... "

    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" -eq 200 ]; then
        # 檢查內容類型
        case $expected_type in
            json)
                if echo "$body" | grep -q "{"; then
                    echo -e "${GREEN}✓ PASS${NC} (JSON response)"
                else
                    echo -e "${RED}✗ FAIL${NC} (Not JSON)"
                fi
                ;;
            html)
                if echo "$body" | grep -q "<html\|<!DOCTYPE"; then
                    echo -e "${GREEN}✓ PASS${NC} (HTML response)"
                else
                    echo -e "${RED}✗ FAIL${NC} (Not HTML)"
                fi
                ;;
            css)
                if echo "$body" | grep -q "{.*}"; then
                    echo -e "${GREEN}✓ PASS${NC} (CSS response)"
                else
                    echo -e "${RED}✗ FAIL${NC} (Not CSS)"
                fi
                ;;
            js)
                if echo "$body" | grep -q "function\|const\|var"; then
                    echo -e "${GREEN}✓ PASS${NC} (JS response)"
                else
                    echo -e "${RED}✗ FAIL${NC} (Not JS)"
                fi
                ;;
        esac
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    fi
}

echo "1️⃣  API Routes Test"
echo "--------------------------------------"
test_route "$BASE_URL/api/books" "GET /api/books" "json"
echo ""

echo "2️⃣  Static Files Test"
echo "--------------------------------------"
test_route "$BASE_URL/app.js" "GET /app.js" "js"
test_route "$BASE_URL/style.css" "GET /style.css" "css"
test_route "$BASE_URL/config.js" "GET /config.js" "js"
echo ""

echo "3️⃣  SPA Fallback Test"
echo "--------------------------------------"
test_route "$BASE_URL/" "GET /" "html"
test_route "$BASE_URL/books" "GET /books" "html"
test_route "$BASE_URL/some/random/path" "GET /some/random/path" "html"
echo ""

echo "======================================"
echo "✅ 測試完成！"
echo "======================================"
echo ""
echo "如果所有測試都通過，表示路由配置正確："
echo "  • API routes 正常運作"
echo "  • 靜態檔案正確提供"
echo "  • SPA fallback 正常工作"
echo ""
