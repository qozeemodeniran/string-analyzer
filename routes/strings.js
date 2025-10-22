const express = require('express');
const router = express.Router();
const StringAnalyzer = require('../utils/stringAnalyzer');
const { pool } = require('../config/database');

// POST /strings - Create/Analyze String
router.post('/', async (req, res) => {
  try {
    const { value } = req.body;

    // Validation
    if (value === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing "value" field in request body'
      });
    }

    if (typeof value !== 'string') {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Invalid data type for "value" (must be string)'
      });
    }

    if (value.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'String value cannot be empty'
      });
    }

    // Analyze string
    const analysis = StringAnalyzer.analyzeString(value);

    // Check if string already exists
    const [existing] = await pool.execute(
      'SELECT id FROM strings WHERE value = ?',
      [analysis.value]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'String already exists in the system'
      });
    }

    // Insert into database
    await pool.execute(
      `INSERT INTO strings (id, value, length, is_palindrome, unique_characters, word_count, character_frequency_map) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        analysis.id,
        analysis.value,
        analysis.properties.length,
        analysis.properties.is_palindrome,
        analysis.properties.unique_characters,
        analysis.properties.word_count,
        JSON.stringify(analysis.properties.character_frequency_map)
      ]
    );

    res.status(201).json(analysis);
  } catch (error) {
    console.error('Error in POST /strings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze string'
    });
  }
});

// GET /strings/{string_value} - Get Specific String
router.get('/:string_value', async (req, res) => {
  try {
    const stringValue = req.params.string_value;

    const [rows] = await pool.execute(
      `SELECT id, value, length, is_palindrome, unique_characters, word_count, 
              character_frequency_map, created_at 
       FROM strings WHERE value = ?`,
      [stringValue]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'String does not exist in the system'
      });
    }

    const stringData = rows[0];
    const response = {
      id: stringData.id,
      value: stringData.value,
      properties: {
        length: stringData.length,
        is_palindrome: Boolean(stringData.is_palindrome),
        unique_characters: stringData.unique_characters,
        word_count: stringData.word_count,
        sha256_hash: stringData.id,
        character_frequency_map: typeof stringData.character_frequency_map === 'string' 
          ? JSON.parse(stringData.character_frequency_map)
          : stringData.character_frequency_map
      },
      created_at: stringData.created_at.toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in GET /strings/:string_value:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve string'
    });
  }
});

// GET /strings - Get All Strings with Filtering
router.get('/', async (req, res) => {
  try {
    const {
      is_palindrome,
      min_length,
      max_length,
      word_count,
      contains_character
    } = req.query;

    // Build WHERE clause and parameters
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Validate and add filters
    if (is_palindrome !== undefined) {
      if (!['true', 'false'].includes(is_palindrome)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid value for is_palindrome (must be true or false)'
        });
      }
      whereClause += ' AND is_palindrome = ?';
      params.push(is_palindrome === 'true');
    }

    if (min_length !== undefined) {
      const minLen = parseInt(min_length);
      if (isNaN(minLen) || minLen < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid value for min_length (must be non-negative integer)'
        });
      }
      whereClause += ' AND length >= ?';
      params.push(minLen);
    }

    if (max_length !== undefined) {
      const maxLen = parseInt(max_length);
      if (isNaN(maxLen) || maxLen < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid value for max_length (must be non-negative integer)'
        });
      }
      whereClause += ' AND length <= ?';
      params.push(maxLen);
    }

    if (min_length !== undefined && max_length !== undefined && parseInt(min_length) > parseInt(max_length)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'min_length cannot be greater than max_length'
      });
    }

    if (word_count !== undefined) {
      const wordCount = parseInt(word_count);
      if (isNaN(wordCount) || wordCount < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid value for word_count (must be non-negative integer)'
        });
      }
      whereClause += ' AND word_count = ?';
      params.push(wordCount);
    }

    if (contains_character !== undefined) {
      if (typeof contains_character !== 'string' || contains_character.length !== 1) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid value for contains_character (must be single character)'
        });
      }
      whereClause += ' AND LOWER(value) LIKE ?';
      params.push(`%${contains_character.toLowerCase()}%`);
    }

    // Execute query
    const [rows] = await pool.execute(
      `SELECT id, value, length, is_palindrome, unique_characters, word_count, 
              character_frequency_map, created_at 
       FROM strings ${whereClause} 
       ORDER BY created_at DESC`,
      params
    );

    const strings = rows.map(row => ({
      id: row.id,
      value: row.value,
      properties: {
        length: row.length,
        is_palindrome: Boolean(row.is_palindrome),
        unique_characters: row.unique_characters,
        word_count: row.word_count,
        sha256_hash: row.id,
        character_frequency_map: typeof row.character_frequency_map === 'string'
          ? JSON.parse(row.character_frequency_map)
          : row.character_frequency_map
      },
      created_at: row.created_at.toISOString()
    }));

    const filtersApplied = {};
    if (is_palindrome !== undefined) filtersApplied.is_palindrome = is_palindrome === 'true';
    if (min_length !== undefined) filtersApplied.min_length = parseInt(min_length);
    if (max_length !== undefined) filtersApplied.max_length = parseInt(max_length);
    if (word_count !== undefined) filtersApplied.word_count = parseInt(word_count);
    if (contains_character !== undefined) filtersApplied.contains_character = contains_character;

    res.status(200).json({
      data: strings,
      count: strings.length,
      filters_applied: filtersApplied
    });
  } catch (error) {
    console.error('Error in GET /strings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve strings'
    });
  }
});

// GET /strings/filter-by-natural-language - Natural Language Filtering
router.get('/filter-by-natural-language', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing or invalid "query" parameter'
      });
    }

    // Parse natural language query
    const parsedFilters = StringAnalyzer.parseNaturalLanguageQuery(query);

    if (Object.keys(parsedFilters).length === 0) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Unable to parse natural language query or no valid filters found'
      });
    }

    // Build WHERE clause for parsed filters
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (parsedFilters.is_palindrome !== undefined) {
      whereClause += ' AND is_palindrome = ?';
      params.push(parsedFilters.is_palindrome);
    }

    if (parsedFilters.min_length !== undefined) {
      whereClause += ' AND length >= ?';
      params.push(parsedFilters.min_length);
    }

    if (parsedFilters.max_length !== undefined) {
      whereClause += ' AND length <= ?';
      params.push(parsedFilters.max_length);
    }

    if (parsedFilters.word_count !== undefined) {
      whereClause += ' AND word_count = ?';
      params.push(parsedFilters.word_count);
    }

    if (parsedFilters.contains_character !== undefined) {
      whereClause += ' AND LOWER(value) LIKE ?';
      params.push(`%${parsedFilters.contains_character}%`);
    }

    // Check for conflicting filters
    if (parsedFilters.min_length !== undefined && parsedFilters.max_length !== undefined && 
        parsedFilters.min_length > parsedFilters.max_length) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Conflicting filters: min_length cannot be greater than max_length',
        interpreted_query: {
          original: query,
          parsed_filters: parsedFilters
        }
      });
    }

    // Execute query
    const [rows] = await pool.execute(
      `SELECT id, value, length, is_palindrome, unique_characters, word_count, 
              character_frequency_map, created_at 
       FROM strings ${whereClause} 
       ORDER BY created_at DESC`,
      params
    );

    const strings = rows.map(row => ({
      id: row.id,
      value: row.value,
      properties: {
        length: row.length,
        is_palindrome: Boolean(row.is_palindrome),
        unique_characters: row.unique_characters,
        word_count: row.word_count,
        sha256_hash: row.id,
        character_frequency_map: typeof row.character_frequency_map === 'string'
          ? JSON.parse(row.character_frequency_map)
          : row.character_frequency_map
      },
      created_at: row.created_at.toISOString()
    }));

    res.status(200).json({
      data: strings,
      count: strings.length,
      interpreted_query: {
        original: query,
        parsed_filters: parsedFilters
      }
    });
  } catch (error) {
    console.error('Error in GET /strings/filter-by-natural-language:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process natural language query'
    });
  }
});

// DELETE /strings/{string_value} - Delete String
router.delete('/:string_value', async (req, res) => {
  try {
    const stringValue = req.params.string_value;

    // Check if string exists
    const [existing] = await pool.execute(
      'SELECT id FROM strings WHERE value = ?',
      [stringValue]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'String does not exist in the system'
      });
    }

    // Delete string
    await pool.execute(
      'DELETE FROM strings WHERE value = ?',
      [stringValue]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error in DELETE /strings/:string_value:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete string'
    });
  }
});

module.exports = router;