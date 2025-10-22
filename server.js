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

// Health check endpoint (without database dependency)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'String Analyzer API',
    database: 'Checking...'
  });
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

// Database connection state
let isDatabaseConnected = false;

const startServer = async () => {
  try {
    console.log('Initializing database connection...');
    console.log('Database URL:', process.env.JAWSDB_URL ? 'Set (hidden for security)' : 'Not set');
    
    await initializeDatabase();
    isDatabaseConnected = true;
    
    app.listen(PORT, () => {
      console.log(`String Analyzer API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Database: Connected and ready');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.log('Server starting without database connection...');
    
    // Start server even if database fails, but log the issue
    app.listen(PORT, () => {
      console.log(`String Analyzer API running on port ${PORT} (Database: Not connected)`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, isDatabaseConnected }; // For testing