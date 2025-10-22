const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.JAWSDB_HOST || 'localhost',
  user: process.env.JAWSDB_USER || 'root',
  password: process.env.JAWSDB_PASSWORD || '',
  database: process.env.JAWSDB_DATABASE || 'string_analyzer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
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
    process.exit(1);
  }
};

module.exports = { pool, initializeDatabase };