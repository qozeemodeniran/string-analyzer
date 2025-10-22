const mysql = require('mysql2/promise');

const getDbConfig = () => {
  // Check if JawsDB URL is available (Heroku)
  if (process.env.JAWSDB_URL) {
    const url = new URL(process.env.JAWSDB_URL);
    return {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      port: url.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  // Fallback to environment variables or local development
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'string_analyzer',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
};

const dbConfig = getDbConfig();
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`📊 Database: ${dbConfig.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database and table
const initializeDatabase = async () => {
  try {
    // For JawsDB, we assume the database already exists
    if (!process.env.JAWSDB_URL) {
      // Only create database if not using JawsDB
      const tempConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
      });

      await tempConnection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await tempConnection.end();
    }

    // Create table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS string_analyses (
        id VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL,
        length INT NOT NULL,
        is_palindrome BOOLEAN NOT NULL,
        unique_characters INT NOT NULL,
        word_count INT NOT NULL,
        sha256_hash VARCHAR(64) NOT NULL UNIQUE,
        character_frequency_map JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_length (length),
        INDEX idx_is_palindrome (is_palindrome),
        INDEX idx_word_count (word_count),
        INDEX idx_created_at (created_at),
        INDEX idx_sha256_hash (sha256_hash),
        FULLTEXT idx_value (value)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(createTableQuery);
    console.log('✅ Database table initialized successfully');
    
    // Test the connection
    await testConnection();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = { pool, initializeDatabase, testConnection };