// 使用 config.js 中的 API 配置
const API_URL = config.API_ENDPOINTS.books;

// DOM Elements
const bookForm = document.getElementById('bookForm');
const booksContainer = document.getElementById('booksContainer');
const bookCountElement = document.getElementById('bookCount');
const categoryCountElement = document.getElementById('categoryCount');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const emptyState = document.getElementById('emptyState');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');

// State
let editingBookId = null;
let allBooks = [];
let allCategories = [];
let currentFilter = '全部';
let selectedImage = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadBooks();
  setupFilterTabs();
  setupDragAndDrop();
});

// Load all categories
async function loadCategories() {
  try {
    const response = await fetch(config.API_ENDPOINTS.categories);
    if (!response.ok) throw new Error('Failed to fetch categories');

    const categories = await response.json();
    allCategories = categories;

    populateCategorySelect();
    populateFilterTabs();
  } catch (error) {
    console.error('Error loading categories:', error);
    // 如果載入失敗，使用預設分類
    allCategories = [
      { name: '小說' }, { name: '漫畫' }, { name: '商業' }, { name: '科普' },
      { name: '藝術' }, { name: '其他' }
    ];
    populateCategorySelect()
    populateFilterTabs();
  }
}

// Populate category select dropdown
function populateCategorySelect() {
  const categorySelect = document.getElementById('category');
  if (!categorySelect) return;

  categorySelect.innerHTML = allCategories
    .map(cat => `<option value="${escapeHtml(cat.name)}" ${cat.name === '其他' ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`)
    .join('');
}

// Populate filter tabs (顯示前 9 個分類為 tab，其餘放入下拉選單)
function populateFilterTabs() {
  const filterTabsContainer = document.querySelector('.filter-tabs');
  if (!filterTabsContainer) return;

  const MAX_VISIBLE_TABS = 9; // 最多顯示 9 個分類標籤（不含"全部"）
  const visibleCategories = allCategories.slice(0, MAX_VISIBLE_TABS);
  const dropdownCategories = allCategories.slice(MAX_VISIBLE_TABS);

  // 清空容器，重新構建
  filterTabsContainer.innerHTML = '';

  // 添加"全部"按鈕
  const allTab = document.createElement('button');
  allTab.className = 'filter-tab active';
  allTab.dataset.filter = '全部';
  allTab.textContent = '全部';
  filterTabsContainer.appendChild(allTab);

  // 添加可見的分類標籤
  visibleCategories.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'filter-tab';
    tab.dataset.filter = cat.name;
    tab.textContent = cat.name;
    filterTabsContainer.appendChild(tab);
  });

  // 如果有多餘的分類，創建並顯示下拉選單
  if (dropdownCategories.length > 0) {
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'filter-dropdown-container';

    const dropdownBtn = document.createElement('button');
    dropdownBtn.className = 'filter-dropdown-btn';
    dropdownBtn.textContent = '更多分類 ▼';

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'filter-dropdown-menu';
    dropdownMenu.innerHTML = dropdownCategories
      .map(cat => `<div class="filter-dropdown-item" data-filter="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</div>`)
      .join('');

    dropdownContainer.appendChild(dropdownBtn);
    dropdownContainer.appendChild(dropdownMenu);
    filterTabsContainer.appendChild(dropdownContainer);
  }

  // 重新設置事件監聽器
  setupFilterTabs();
  setupDropdownFilter();
}

// Add new category
async function addNewCategory() {
  const categoryName = prompt('請輸入新分類名稱：');
  if (!categoryName || !categoryName.trim()) return;

  try {
    const response = await fetch(config.API_ENDPOINTS.categories, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName.trim() })
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 409) {
        showToast('⚠️ 此分類已存在');
      } else {
        throw new Error(error.error || 'Failed to create category');
      }
      return;
    }

    const result = await response.json();
    showToast(`✅ 分類「${result.category.name}」已新增`);

    // 重新載入分類並選中新增的分類
    await loadCategories();
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
      categorySelect.value = result.category.name;
    }
  } catch (error) {
    console.error('Error adding category:', error);
    showToast('❌ 新增分類失敗');
  }
}

// Load all books
async function loadBooks() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch books');

    const data = await response.json();
    allBooks = data.books || [];

    filterBooks(currentFilter);
    updateStats();
  } catch (error) {
    console.error('Error loading books:', error);
    booksContainer.innerHTML = '<p class="loading">❌ 無法載入書籍，請確認後端伺服器已啟動</p>';
  }
}

// Filter books by category
function filterBooks(category) {
  currentFilter = category;
  let filteredBooks = category === '全部'
    ? allBooks
    : allBooks.filter(book => book.category === category);

  displayBooks(filteredBooks);
}

// Setup filter tabs
function setupFilterTabs() {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterBooks(tab.dataset.filter);
    });
  });
}

// Setup dropdown filter
function setupDropdownFilter() {
  const dropdownBtn = document.querySelector('.filter-dropdown-btn');
  const dropdownMenu = document.querySelector('.filter-dropdown-menu');

  if (!dropdownBtn || !dropdownMenu) return;

  // 切換下拉選單顯示
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  // 點擊下拉選項
  document.querySelectorAll('.filter-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const filter = item.dataset.filter;

      // 移除所有 tab 的 active 狀態
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));

      // 過濾書籍
      filterBooks(filter);

      // 關閉下拉選單
      dropdownMenu.classList.remove('show');
    });
  });

  // 點擊外部關閉下拉選單
  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });
}

// Display books in grid
function displayBooks(books) {
  if (books.length === 0) {
    booksContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  booksContainer.style.display = 'grid';
  emptyState.style.display = 'none';

  booksContainer.innerHTML = books.map(book => `
    <div class="book-card" data-id="${book.id}">
      <div class="book-cover">
        ${book.cover_url
          ? `<img src="${book.cover_url}" alt="${escapeHtml(book.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="book-cover-placeholder book-cover-error" style="display:none;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <span>${escapeHtml(book.title)}</span>
              ${book.url ? `<button class="retry-cover-btn" onclick="fetchSingleCover(${book.id})">🔄 重試</button>` : ''}
             </div>`
          : `<div class="book-cover-placeholder book-cover-no-image">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <span>${escapeHtml(book.title)}</span>
              ${book.url ? `<button class="retry-cover-btn" onclick="fetchSingleCover(${book.id})">📷 抓取封面</button>` : ''}
             </div>`
        }
        <span class="book-type-badge">${escapeHtml(book.category || '其他')}</span>
        <div class="book-actions">
          <button class="action-btn" onclick="editBook(${book.id})" title="編輯">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-btn" onclick="deleteBook(${book.id})" title="刪除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="book-info">
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.author || '未知作者')}</p>
        <p class="book-category">📂 ${escapeHtml(book.category || '其他')}</p>
        <p class="book-date">📅 ${formatDate(book.created_at)}</p>
        <div class="book-meta">
          ${book.url
            ? `<a href="${book.url}" target="_blank" class="book-link">
                查看連結
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
               </a>`
            : '<span></span>'
          }
        </div>
      </div>
    </div>
  `).join('');
}

// Update statistics
function updateStats() {
  bookCountElement.textContent = allBooks.length;

  const categories = new Set(allBooks.map(book => book.category || '其他'));
  categoryCountElement.textContent = categories.size;
}

// Modal functions
function openModal(id = null) {
  editingBookId = id;

  if (id) {
    const book = allBooks.find(b => b.id === parseInt(id));
    if (book) {
      modalTitle.textContent = '編輯書籍';
      document.getElementById('title').value = book.title;
      document.getElementById('author').value = book.author || '';
      document.getElementById('category').value = book.category || '其他';
      document.getElementById('url').value = book.url || '';
      document.getElementById('books_url').value = book.books_url || '';
      document.getElementById('cover_url').value = book.cover_url || '';
    }
  } else {
    modalTitle.textContent = '新增書籍';
    bookForm.reset();
  }

  modalOverlay.classList.add('active');
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget && !event.target.classList.contains('close-btn')) return;
  modalOverlay.classList.remove('active');
  bookForm.reset();
  editingBookId = null;
}

// Save book
async function saveBook() {
  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const category = document.getElementById('category').value;
  const url = document.getElementById('url').value.trim() || null;
  const books_url = document.getElementById('books_url').value.trim() || null;
  const cover_url = document.getElementById('cover_url').value.trim() || null;

  if (!title || !author) {
    showToast('請輸入書名和作者');
    return;
  }

  const formData = { title, author, category, url, books_url, cover_url };

  try {
    let response;
    if (editingBookId) {
      response = await fetch(`${API_URL}/${editingBookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }

    if (!response.ok) throw new Error('Failed to save book');

    const result = await response.json();
    console.log('Book saved:', result);

    closeModal();
    loadBooks();
    showToast(editingBookId ? '書籍已更新' : '書籍已新增');
  } catch (error) {
    console.error('Error saving book:', error);
    showToast('❌ 儲存失敗，請稍後再試');
  }
}

// Edit book
async function editBook(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch book');

    const data = await response.json();
    const book = data.book;

    editingBookId = id;
    modalTitle.textContent = '編輯書籍';
    document.getElementById('title').value = book.title;
    document.getElementById('author').value = book.author || '';
    document.getElementById('category').value = book.category || '其他';
    document.getElementById('url').value = book.url || '';
    document.getElementById('books_url').value = book.books_url || '';
    document.getElementById('cover_url').value = book.cover_url || '';

    modalOverlay.classList.add('active');
  } catch (error) {
    console.error('Error loading book for edit:', error);
    showToast('❌ 無法載入書籍資料');
  }
}

// Delete book
async function deleteBook(id) {
  if (!confirm('確定要刪除這本書嗎？')) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete book');

    console.log('Book deleted');
    loadBooks();
    showToast('書籍已刪除');
  } catch (error) {
    console.error('Error deleting book:', error);
    showToast('❌ 刪除失敗，請稍後再試');
  }
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility: Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============= AI Import Functions =============

// Open AI Import Modal
function openAIImportModal() {
  const aiImportModal = document.getElementById('aiImportModal');
  aiImportModal.classList.add('active');
  resetAIImportModal();
}

// Close AI Import Modal
function closeAIImportModal(event) {
  if (event && event.target !== event.currentTarget && !event.target.classList.contains('close-btn')) return;
  const aiImportModal = document.getElementById('aiImportModal');
  aiImportModal.classList.remove('active');
  resetAIImportModal();
}

// Reset AI Import Modal
function resetAIImportModal() {
  selectedImage = null;
  document.getElementById('imageInput').value = '';
  document.getElementById('uploadArea').style.display = 'block';
  document.getElementById('imagePreviewContainer').style.display = 'none';
  document.getElementById('aiLoading').style.display = 'none';
  document.getElementById('importResult').style.display = 'none';
  document.getElementById('uploadBtn').disabled = true;
}

// Handle image selection
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 檢查檔案大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    showToast('圖片大小不能超過 5MB');
    return;
  }

  // 檢查檔案類型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    showToast('只支援 JPG, PNG, WEBP, GIF 格式');
    return;
  }

  selectedImage = file;

  // 預覽圖片
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('imagePreview').src = e.target.result;
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('imagePreviewContainer').style.display = 'block';
    document.getElementById('uploadBtn').disabled = false;
  };
  reader.readAsDataURL(file);
}

// Remove selected image
function removeImage() {
  selectedImage = null;
  document.getElementById('imageInput').value = '';
  document.getElementById('uploadArea').style.display = 'block';
  document.getElementById('imagePreviewContainer').style.display = 'none';
  document.getElementById('uploadBtn').disabled = true;
}

// Upload image and import books
async function uploadImage() {
  if (!selectedImage) {
    showToast('請先選擇圖片');
    return;
  }

  // 隱藏預覽，顯示載入動畫
  document.getElementById('imagePreviewContainer').style.display = 'none';
  document.getElementById('aiLoading').style.display = 'block';
  document.getElementById('uploadBtn').disabled = true;

  try {
    // 建立 FormData
    const formData = new FormData();
    formData.append('image', selectedImage);

    // 上傳到 API
    const response = await fetch(config.API_ENDPOINTS.importFromImage, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '上傳失敗');
    }

    const result = await response.json();

    // 隱藏載入動畫，顯示結果
    document.getElementById('aiLoading').style.display = 'none';
    document.getElementById('importResult').style.display = 'block';

    // 顯示結果
    if (result.imported > 0) {
      document.getElementById('resultTitle').textContent = '匯入成功！';
      document.getElementById('resultMessage').textContent = `${result.message}，正在抓取封面...`;

      // 顯示匯入的書籍列表
      const booksList = document.getElementById('importedBooksList');
      booksList.innerHTML = '<h4 style="margin-bottom: 12px; color: var(--text-secondary);">已匯入的書籍：</h4>';

      result.books.forEach(book => {
        const bookItem = document.createElement('div');
        bookItem.className = 'imported-book-item';
        bookItem.innerHTML = `
          <h4>${escapeHtml(book.title)}</h4>
          <p>作者：${escapeHtml(book.author)}</p>
          ${book.link ? `<p style="opacity: 0.7; margin-top: 4px;"><a href="${escapeHtml(book.link)}" target="_blank" style="color: var(--accent); text-decoration: none;">📚 查看購買連結</a></p>` : ''}
        `;
        booksList.appendChild(bookItem);
      });

      showToast(`成功匯入 ${result.imported} 本書籍！`);

      // 自動批次抓取封面
      const bookIds = result.books.map(book => book.id);
      await batchFetchCovers(bookIds, booksList);
    } else {
      document.getElementById('resultTitle').textContent = '未辨識到書籍';
      document.getElementById('resultMessage').textContent = '圖片中沒有辨識到任何書籍，請嘗試使用更清晰的圖片。';
      document.getElementById('importedBooksList').innerHTML = '';
    }

  } catch (error) {
    console.error('AI 匯入錯誤:', error);

    // 隱藏載入動畫，顯示錯誤
    document.getElementById('aiLoading').style.display = 'none';
    document.getElementById('importResult').style.display = 'block';

    document.getElementById('resultTitle').textContent = '匯入失敗';
    document.getElementById('resultMessage').textContent = error.message || '發生未知錯誤，請稍後再試';
    document.getElementById('importedBooksList').innerHTML = '';

    showToast('❌ ' + (error.message || '匯入失敗'));
  }
}

// Setup drag and drop
function setupDragAndDrop() {
  const uploadArea = document.getElementById('uploadArea');

  if (!uploadArea) return;

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight drop area when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.style.borderColor = 'var(--accent)';
      uploadArea.style.background = 'rgba(201, 169, 98, 0.1)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.style.borderColor = 'var(--border)';
      uploadArea.style.background = 'var(--bg-card)';
    }, false);
  });

  // Handle dropped files
  uploadArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      const file = files[0];
      const imageInput = document.getElementById('imageInput');

      // Create a new FileList-like object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      imageInput.files = dataTransfer.files;

      // Trigger change event
      handleImageSelect({ target: { files: [file] } });
    }
  }, false);
}

// ============= Cover Fetch Functions =============

/**
 * 批次抓取封面
 */
async function batchFetchCovers(bookIds, progressContainer = null) {
  try {
    if (progressContainer) {
      const progressDiv = document.createElement('div');
      progressDiv.id = 'coverFetchProgress';
      progressDiv.style.cssText = 'margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 4px;';
      progressDiv.innerHTML = `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">正在抓取封面圖片...</p>
        <div class="progress-bar">
          <div class="progress-fill" id="coverProgress" style="width: 0%"></div>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;" id="coverProgressText">0/${bookIds.length} 已完成</p>
      `;
      progressContainer.appendChild(progressDiv);
    }

    const response = await fetch(config.API_ENDPOINTS.batchFetchCovers, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookIds }),
    });

    if (!response.ok) {
      throw new Error('批次抓取封面失敗');
    }

    const result = await response.json();

    if (progressContainer) {
      const progressDiv = document.getElementById('coverFetchProgress');
      if (progressDiv) {
        progressDiv.innerHTML = `
          <p style="color: var(--accent);">✓ 封面抓取完成！</p>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            成功 ${result.success} 本，失敗 ${result.failed} 本
          </p>
        `;
      }
    }

    showToast(`封面抓取完成：成功 ${result.success} 本`);

    // 重新載入書籍列表
    setTimeout(() => {
      loadBooks();
    }, 1000);

  } catch (error) {
    console.error('批次抓取封面錯誤:', error);
    showToast('封面抓取失敗：' + error.message);
  }
}

/**
 * 單一書籍抓取封面
 */
async function fetchSingleCover(bookId) {
  try {
    const response = await fetch(config.API_ENDPOINTS.fetchCover(bookId), {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('抓取封面失敗');
    }

    const result = await response.json();

    if (result.success) {
      showToast(`封面抓取成功：${result.book.title}`);
      loadBooks(); // 重新載入書籍列表
    } else {
      showToast(`封面抓取失敗：${result.message}`);
    }

  } catch (error) {
    console.error('抓取封面錯誤:', error);
    showToast('封面抓取失敗：' + error.message);
  }
}
