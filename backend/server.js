import express from 'express';
import cors from 'cors';
import booksRouter from './routes/books.js';
import imageImportRouter from './routes/imageImport.js';
import coverFetchRouter from './routes/coverFetch.js';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/books', booksRouter);
app.use('/api/books', imageImportRouter);
app.use('/api/books', coverFetchRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Bookshelf API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
