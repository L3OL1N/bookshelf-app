const API_URL = 'http://localhost:3000/api/books';

// DOM Elements
const bookForm = document.getElementById('bookForm');
const booksContainer = document.getElementById('booksContainer');
const bookCountElement = document.getElementById('bookCount');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

// State
let editingBookId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadBooks();
  bookForm.addEventListener('submit', handleSubmit);
  cancelBtn.addEventListener('click', cancelEdit);
});

// Load all books
async function loadBooks() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch books');

    const data = await response.json();
    const books = data.books || [];

    displayBooks(books);
    updateBookCount(books.length);
  } catch (error) {
    console.error('Error loading books:', error);
    booksContainer.innerHTML = '<p class="error">❌ 無法載入書籍，請確認後端伺服器已啟動</p>';
  }
}

// Display books in grid
function displayBooks(books) {
  if (books.length === 0) {
    booksContainer.innerHTML = '<p class="empty">📭 目前沒有任何書籍，開始新增第一本書吧！</p>';
    return;
  }

  booksContainer.innerHTML = books.map(book => `
    <div class="book-card" data-id="${book.id}">
      ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}" class="book-cover">` : '<div class="book-cover"></div>'}
      <div class="book-info">
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">👤 ${escapeHtml(book.author)}</p>
        <p class="book-date">📅 ${formatDate(book.created_at)}</p>
        ${book.url ? `<a href="${book.url}" class="book-link" target="_blank">🔗 查看書籍連結</a>` : ''}
      </div>
      <div class="book-actions">
        <button class="btn btn-edit" onclick="editBook(${book.id})">編輯</button>
        <button class="btn btn-delete" onclick="deleteBook(${book.id})">刪除</button>
      </div>
    </div>
  `).join('');
}

// Update book count
function updateBookCount(count) {
  bookCountElement.textContent = count;
}

// Handle form submit (Create or Update)
async function handleSubmit(e) {
  e.preventDefault();

  const formData = {
    title: document.getElementById('title').value.trim(),
    author: document.getElementById('author').value.trim(),
    url: document.getElementById('url').value.trim() || null,
    cover_url: document.getElementById('cover_url').value.trim() || null
  };

  try {
    let response;
    if (editingBookId) {
      // Update existing book
      response = await fetch(`${API_URL}/${editingBookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      // Create new book
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }

    if (!response.ok) throw new Error('Failed to save book');

    const result = await response.json();
    console.log('Book saved:', result);

    // Reset form and reload books
    bookForm.reset();
    cancelEdit();
    loadBooks();
  } catch (error) {
    console.error('Error saving book:', error);
    alert('❌ 儲存失敗，請稍後再試');
  }
}

// Edit book
async function editBook(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch book');

    const data = await response.json();
    const book = data.book;

    // Populate form
    document.getElementById('title').value = book.title;
    document.getElementById('author').value = book.author;
    document.getElementById('url').value = book.url || '';
    document.getElementById('cover_url').value = book.cover_url || '';

    // Update UI state
    editingBookId = id;
    submitBtn.textContent = '更新書籍';
    cancelBtn.style.display = 'inline-block';

    // Scroll to form
    document.querySelector('.add-book-section').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Error loading book for edit:', error);
    alert('❌ 無法載入書籍資料');
  }
}

// Cancel edit
function cancelEdit() {
  editingBookId = null;
  submitBtn.textContent = '新增書籍';
  cancelBtn.style.display = 'none';
  bookForm.reset();
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
  } catch (error) {
    console.error('Error deleting book:', error);
    alert('❌ 刪除失敗，請稍後再試');
  }
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
