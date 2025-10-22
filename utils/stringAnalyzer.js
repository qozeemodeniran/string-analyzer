const crypto = require('crypto');

class StringAnalyzer {
  static analyzeString(value) {
    if (typeof value !== 'string') {
      throw new Error('Value must be a string');
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error('Value cannot be empty');
    }

    // Calculate properties
    const length = trimmedValue.length;
    const isPalindrome = this.isPalindrome(trimmedValue);
    const uniqueCharacters = this.countUniqueCharacters(trimmedValue);
    const wordCount = this.countWords(trimmedValue);
    const sha256Hash = this.generateSHA256(trimmedValue);
    const characterFrequencyMap = this.getCharacterFrequency(trimmedValue);

    return {
      id: sha256Hash,
      value: trimmedValue,
      properties: {
        length,
        is_palindrome: isPalindrome,
        unique_characters: uniqueCharacters,
        word_count: wordCount,
        sha256_hash: sha256Hash,
        character_frequency_map: characterFrequencyMap
      },
      created_at: new Date().toISOString()
    };
  }

  static isPalindrome(str) {
    const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanStr === cleanStr.split('').reverse().join('');
  }

  static countUniqueCharacters(str) {
    const uniqueChars = new Set(str.toLowerCase());
    return uniqueChars.size;
  }

  static countWords(str) {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  static generateSHA256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  static getCharacterFrequency(str) {
    const frequency = {};
    for (const char of str.toLowerCase()) {
      frequency[char] = (frequency[char] || 0) + 1;
    }
    return frequency;
  }

  static parseNaturalLanguageQuery(query) {
    const lowerQuery = query.toLowerCase();
    const filters = {};

    // Check for palindrome-related terms
    if (lowerQuery.includes('palindrom')) {
      filters.is_palindrome = true;
    }

    // Check for length-related terms
    const longerMatch = lowerQuery.match(/longer than (\d+)/) || 
                       lowerQuery.match(/more than (\d+)/);
    const shorterMatch = lowerQuery.match(/shorter than (\d+)/) || 
                        lowerQuery.match(/less than (\d+)/);
    
    if (longerMatch) {
      filters.min_length = parseInt(longerMatch[1]) + 1;
    }
    if (shorterMatch) {
      filters.max_length = parseInt(shorterMatch[1]) - 1;
    }

    // Check for word count
    const singleWordMatch = lowerQuery.match(/single word/) || 
                           lowerQuery.match(/one word/);
    if (singleWordMatch) {
      filters.word_count = 1;
    }

    // Check for character containment
    const charMatch = lowerQuery.match(/contain[s]? [a-zA-Z]/) || 
                     lowerQuery.match(/has [a-zA-Z]/) ||
                     lowerQuery.match(/with [a-zA-Z]/);
    if (charMatch) {
      const words = lowerQuery.split(' ');
      const charIndex = words.findIndex(word => 
        ['contain', 'contains', 'has', 'with'].includes(word)
      );
      if (charIndex !== -1 && words[charIndex + 1]) {
        const nextWord = words[charIndex + 1];
        const char = nextWord.match(/[a-zA-Z]/);
        if (char) {
          filters.contains_character = char[0].toLowerCase();
        }
      }
    }

    // Check for vowel specifically
    if (lowerQuery.includes('vowel')) {
      filters.contains_character = 'a'; // Default to first vowel
    }

    return filters;
  }
}

module.exports = StringAnalyzer;