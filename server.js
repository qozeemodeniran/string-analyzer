const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase } = require('./config/database');

// Import routes
const stringRoutes = require('./routes/strings');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const connection = await pool.getConnection();
    connection.release();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'String Analyzer API',
      database: 'Connected to JawsDB'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      service: 'String Analyzer API',
      database: 'Not connected',
      error: error.message
    });
  }
});

// Routes
app.use('/strings', stringRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

const startServer = async () => {
  try {
    console.log('🚀 Starting String Analyzer Service...');
    console.log('📊 Initializing JawsDB database connection...');
    
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ String Analyzer API running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: JawsDB MySQL`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    console.log('\n🔧 To fix this issue:');
    console.log('1. For Heroku: Make sure JawsDB MySQL addon is installed');
    console.log('2. For local development: Set JAWSDB_URL environment variable');
    console.log('3. Get your JawsDB URL from: heroku config:get JAWSDB_URL');
    process.exit(1);
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;