const mysql = require('mysql2/promise');

// Parse JawsDB URL or use individual environment variables
const getDbConfig = () => {
  // If JAWSDB_URL is available (Heroku), use that
  if (process.env.JAWSDB_URL) {
    const url = new URL(process.env.JAWSDB_URL);
    return {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1), // Remove leading slash
      port: url.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }
  
  // Fallback to individual environment variables (for local development)
  return {
    host: process.env.JAWSDB_HOST || 'localhost',
    user: process.env.JAWSDB_USER || 'root',
    password: process.env.JAWSDB_PASSWORD || '',
    database: process.env.JAWSDB_DATABASE || 'string_analyzer',
    port: process.env.JAWSDB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
};

const pool = mysql.createPool(getDbConfig());

const initializeDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to database successfully');
    
    // Create strings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS strings (
        id VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL,
        length INT NOT NULL,
        is_palindrome BOOLEAN NOT NULL,
        unique_characters INT NOT NULL,
        word_count INT NOT NULL,
        character_frequency_map JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_value (value(255))
      )
    `);
    
    console.log('Database initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Database initialization failed:', error);
    if (connection) connection.release();
    throw error;
  }
};

module.exports = { pool, initializeDatabase };