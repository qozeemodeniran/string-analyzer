const mysql = require('mysql2/promise');

const getDbConfig = () => {
  // Require JAWSDB_URL for all environments
  if (!process.env.JAWSDB_URL) {
    throw new Error('JAWSDB_URL environment variable is required. Please add JawsDB MySQL addon to your Heroku app.');
  }

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
    ssl: { rejectUnauthorized: false } // Required for JawsDB
  };
};

const pool = mysql.createPool(getDbConfig());

const initializeDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to JawsDB MySQL database successfully');
    
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
    
    console.log('✅ Database table initialized successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (connection) connection.release();
    throw error;
  }
};

module.exports = { pool, initializeDatabase };