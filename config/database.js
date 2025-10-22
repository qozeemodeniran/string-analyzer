const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.JAWSDB_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.JAWSDB_USER || process.env.DB_USER || 'root',
  password: process.env.JAWSDB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.JAWSDB_DATABASE || process.env.DB_NAME || 'string_analyzer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and table
const initializeDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it doesn't exist
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    
    await connection.end();

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
        INDEX idx_created_at (created_at)
      )
    `;

    await pool.execute(createTableQuery);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = { pool, initializeDatabase };