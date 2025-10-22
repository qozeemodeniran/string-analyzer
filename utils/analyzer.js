const crypto = require('crypto');

function analyzeString(inputString) {
  if (typeof inputString !== 'string') {
    const error = new Error('Invalid data type for "value" (must be string)');
    error.status = 422;
    throw error;
  }

  // Basic validation
  if (inputString === undefined || inputString === null) {
    const error = new Error('Invalid request body or missing "value" field');
    error.status = 400;
    throw error;
  }

  const length = inputString.length;
  
  // Case-insensitive palindrome check (ignore non-alphanumeric characters)
  const cleanString = inputString.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const is_palindrome = cleanString.length > 0 && 
                       cleanString === cleanString.split('').reverse().join('');
  
  // Unique characters count
  const unique_characters = new Set(inputString).size;
  
  // Word count (split by whitespace and filter empty strings)
  const word_count = inputString.trim() ? inputString.trim().split(/\s+/).length : 0;
  
  // SHA-256 hash
  const sha256_hash = crypto.createHash('sha256').update(inputString).digest('hex');
  
  // Character frequency map
  const character_frequency_map = {};
  for (const char of inputString) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }

  return {
    id: sha256_hash,
    value: inputString,
    properties: {
      length,
      is_palindrome,
      unique_characters,
      word_count,
      sha256_hash,
      character_frequency_map
    },
    created_at: new Date().toISOString()
  };
}

// Enhanced Natural language query parser
function parseNaturalLanguageQuery(query) {
  if (!query || typeof query !== 'string') {
    const error = new Error('Query parameter is required and must be a string');
    error.status = 400;
    throw error;
  }

  const lowerQuery = query.toLowerCase().trim();
  const filters = {};

  // Parse palindrome-related queries
  if (lowerQuery.includes('palindrom')) {
    filters.is_palindrome = true;
  }

  // Parse length-related queries
  const longerMatch = lowerQuery.match(/(?:longer than|greater than|more than|over)\s+(\d+)\s*(?:characters?|chars?)?/);
  if (longerMatch) {
    filters.min_length = parseInt(longerMatch[1]) + 1;
  }

  const shorterMatch = lowerQuery.match(/(?:shorter than|less than|under)\s+(\d+)\s*(?:characters?|chars?)?/);
  if (shorterMatch) {
    filters.max_length = parseInt(shorterMatch[1]) - 1;
  }

  const exactLengthMatch = lowerQuery.match(/(\d+)\s*(?:characters?|chars?)\s*(?:long|length)?/);
  if (exactLengthMatch && !longerMatch && !shorterMatch) {
    filters.min_length = parseInt(exactLengthMatch[1]);
    filters.max_length = parseInt(exactLengthMatch[1]);
  }

  // Parse word count queries
  const singleWordMatch = lowerQuery.match(/(?:single|one)\s+word/);
  if (singleWordMatch) {
    filters.word_count = 1;
  }

  const twoWordsMatch = lowerQuery.match(/(?:two|2)\s+words?/);
  if (twoWordsMatch) {
    filters.word_count = 2;
  }

  const multiWordMatch = lowerQuery.match(/(\d+)\s+words?/);
  if (multiWordMatch && !singleWordMatch) {
    filters.word_count = parseInt(multiWordMatch[1]);
  }

  // Parse character containment queries
  const charMatch = lowerQuery.match(/(?:containing|with|that have|having|contains?)\s+(?:the\s+)?(?:letter|character)\s+['"]?([a-zA-Z])['"]?/);
  if (charMatch) {
    filters.contains_character = charMatch[1].toLowerCase();
  }

  const specificCharMatch = lowerQuery.match(/(?:containing|with|that have|having|contains?)\s+['"]?([a-zA-Z])['"]?/);
  if (specificCharMatch && !charMatch) {
    filters.contains_character = specificCharMatch[1].toLowerCase();
  }

  const vowelMatch = lowerQuery.match(/(?:first\s+)?vowel/);
  if (vowelMatch) {
    filters.contains_character = 'a';
  }

  // Handle "all" queries specifically
  if (lowerQuery.includes('all')) {
    if (lowerQuery.includes('single word') && lowerQuery.includes('palindrom')) {
      filters.word_count = 1;
      filters.is_palindrome = true;
    }
  }

  // Validate that we parsed at least one filter
  if (Object.keys(filters).length === 0) {
    const error = new Error('Unable to parse natural language query. No valid filters found.');
    error.status = 400;
    throw error;
  }

  // Check for conflicting filters
  if (filters.min_length !== undefined && filters.max_length !== undefined) {
    if (filters.min_length > filters.max_length) {
      const error = new Error('Conflicting filters: min_length cannot be greater than max_length');
      error.status = 422;
      throw error;
    }
  }

  return filters;
}

module.exports = { analyzeString, parseNaturalLanguageQuery };