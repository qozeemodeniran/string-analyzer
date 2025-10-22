const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const stringRoutes = require('./routes/strings');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/strings', stringRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'String Analyzer API'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'String Analyzer API',
    version: '1.0.0',
    endpoints: {
      'POST /strings': 'Analyze and store a string',
      'GET /strings/{value}': 'Get specific string analysis',
      'GET /strings': 'Get all strings with filtering',
      'GET /strings/filter-by-natural-language': 'Natural language filtering',
      'DELETE /strings/{value}': 'Delete a string'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Route ${req.originalUrl} does not exist`
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;