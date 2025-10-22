// Script to manually initialize database
const { initializeDatabase, testConnection } = require('../config/database');

async function init() {
  console.log('🔄 Initializing database...');
  try {
    await initializeDatabase();
    console.log('✅ Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

init();