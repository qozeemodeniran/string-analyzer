const express = require('express');
const router = express.Router();
const StringAnalysis = require('../models/StringAnalysis');
const { parseNaturalLanguageQuery } = require('../utils/analyzer');

// POST /strings - Create/Analyze String
router.post('/', async (req, res, next) => {
  try {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request body or missing "value" field'
      });
    }

    const analysis = await StringAnalysis.create(value);
    res.status(201).json(analysis);
  } catch (error) {
    next(error);
  }
});

// GET /strings/:value - Get Specific String
router.get('/:value', async (req, res, next) => {
  try {
    const { value } = req.params;
    
    // Validate input
    if (typeof value !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid string value'
      });
    }

    const analysis = await StringAnalysis.findByValue(value);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// GET /strings - Get All Strings with Filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      is_palindrome,
      min_length,
      max_length,
      word_count,
      contains_character
    } = req.query;

    // Build filters object
    const filters = {};
    
    if (is_palindrome !== undefined) {
      if (is_palindrome !== 'true' && is_palindrome !== 'false') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'is_palindrome must be "true" or "false"'
        });
      }
      filters.is_palindrome = is_palindrome === 'true';
    }
    
    if (min_length !== undefined) {
      const min = parseInt(min_length);
      if (isNaN(min) || min < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'min_length must be a positive integer'
        });
      }
      filters.min_length = min;
    }
    
    if (max_length !== undefined) {
      const max = parseInt(max_length);
      if (isNaN(max) || max < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'max_length must be a positive integer'
        });
      }
      filters.max_length = max;
    }
    
    if (max_length !== undefined && min_length !== undefined) {
      if (max_length < min_length) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'max_length cannot be less than min_length'
        });
      }
    }
    
    if (word_count !== undefined) {
      const count = parseInt(word_count);
      if (isNaN(count) || count < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'word_count must be a positive integer'
        });
      }
      filters.word_count = count;
    }
    
    if (contains_character !== undefined) {
      if (contains_character.length !== 1) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'contains_character must be a single character'
        });
      }
      filters.contains_character = contains_character;
    }

    const results = await StringAnalysis.findAll(filters);
    
    res.json({
      data: results,
      count: results.length,
      filters_applied: filters
    });
  } catch (error) {
    next(error);
  }
});

// GET /strings/filter-by-natural-language - Natural Language Filtering
router.get('/filter-by-natural-language', async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter is required and must be a string'
      });
    }

    const parsedFilters = parseNaturalLanguageQuery(query);
    const results = await StringAnalysis.findAll(parsedFilters);

    res.json({
      data: results,
      count: results.length,
      interpreted_query: {
        original: query,
        parsed_filters: parsedFilters
      }
    });
  } catch (error) {
    if (error.status === 400 || error.status === 422) {
      return res.status(error.status).json({
        error: error.status === 400 ? 'Bad Request' : 'Unprocessable Entity',
        message: error.message
      });
    }
    next(error);
  }
});

// DELETE /strings/:value - Delete String
router.delete('/:value', async (req, res, next) => {
  try {
    const { value } = req.params;
    
    if (typeof value !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid string value'
      });
    }

    await StringAnalysis.deleteByValue(value);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;