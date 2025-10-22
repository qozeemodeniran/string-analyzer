const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initializeDatabase, testConnection } = require('./config/database');
const stringRoutes = require('./routes/strings');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database initialization
app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    next(error);
  }
});

// Routes
app.use('/strings', stringRoutes);

// Health check with database status
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.status(200).json({ 
    status: 'OK', 
    database: dbStatus ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    service: 'String Analyzer API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'String Analyzer API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      'POST /strings': 'Analyze and store a string',
      'GET /strings/{value}': 'Get specific string analysis',
      'GET /strings': 'Get all strings with filtering',
      'GET /strings/filter-by-natural-language': 'Natural language filtering',
      'DELETE /strings/{value}': 'Delete a string',
      'GET /health': 'Health check'
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

// Start server
const startServer = async () => {
  try {
    // Initialize database before starting server
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      
      // Log database connection info (without password)
      if (process.env.JAWSDB_URL) {
        const dbUrl = new URL(process.env.JAWSDB_URL);
        console.log(`🗄️ Database: JawsDB (${dbUrl.hostname})`);
      } else {
        console.log(`🗄️ Database: ${process.env.DB_HOST || 'localhost'}`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;