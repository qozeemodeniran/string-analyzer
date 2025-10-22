const { pool } = require('../config/database');
const { analyzeString } = require('../utils/analyzer');

class StringAnalysis {
  static async create(stringValue) {
    const analysis = analyzeString(stringValue);
    
    const insertQuery = `
      INSERT INTO string_analyses 
      (id, value, length, is_palindrome, unique_characters, word_count, sha256_hash, character_frequency_map) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      analysis.properties.sha256_hash,
      stringValue,
      analysis.properties.length,
      analysis.properties.is_palindrome,
      analysis.properties.unique_characters,
      analysis.properties.word_count,
      analysis.properties.sha256_hash,
      JSON.stringify(analysis.properties.character_frequency_map)
    ];

    try {
      await pool.execute(insertQuery, values);
      return analysis;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        const conflictError = new Error('String already exists in the system');
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }
  }

  static async findByValue(stringValue) {
    const query = 'SELECT * FROM string_analyses WHERE value = ?';
    const [rows] = await pool.execute(query, [stringValue]);
    
    if (rows.length === 0) {
      const error = new Error('String does not exist in the system');
      error.status = 404;
      throw error;
    }
    
    return this.formatResponse(rows[0]);
  }

  static async findByHash(sha256Hash) {
    const query = 'SELECT * FROM string_analyses WHERE sha256_hash = ?';
    const [rows] = await pool.execute(query, [sha256Hash]);
    
    if (rows.length === 0) {
      const error = new Error('String does not exist in the system');
      error.status = 404;
      throw error;
    }
    
    return this.formatResponse(rows[0]);
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM string_analyses WHERE 1=1';
    const values = [];
    
    // Apply filters
    if (filters.is_palindrome !== undefined) {
      query += ' AND is_palindrome = ?';
      values.push(filters.is_palindrome);
    }
    
    if (filters.min_length !== undefined) {
      query += ' AND length >= ?';
      values.push(filters.min_length);
    }
    
    if (filters.max_length !== undefined) {
      query += ' AND length <= ?';
      values.push(filters.max_length);
    }
    
    if (filters.word_count !== undefined) {
      query += ' AND word_count = ?';
      values.push(filters.word_count);
    }
    
    // FIXED: Character frequency filter - check if character exists in the frequency map
    if (filters.contains_character !== undefined && filters.contains_character.length === 1) {
      query += ' AND JSON_EXTRACT(character_frequency_map, ?) IS NOT NULL';
      values.push(`$.${filters.contains_character}`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, values);
    return rows.map(row => this.formatResponse(row));
  }

  static async deleteByValue(stringValue) {
    const query = 'DELETE FROM string_analyses WHERE value = ?';
    const [result] = await pool.execute(query, [stringValue]);
    
    if (result.affectedRows === 0) {
      const error = new Error('String does not exist in the system');
      error.status = 404;
      throw error;
    }
    
    return true;
  }

  static formatResponse(row) {
    return {
      id: row.id,
      value: row.value,
      properties: {
        length: row.length,
        is_palindrome: Boolean(row.is_palindrome),
        unique_characters: row.unique_characters,
        word_count: row.word_count,
        sha256_hash: row.sha256_hash,
        character_frequency_map: JSON.parse(row.character_frequency_map)
      },
      created_at: row.created_at.toISOString()
    };
  }
}

module.exports = StringAnalysis;