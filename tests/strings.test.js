const request = require('supertest');
const app = require('../server');
const { pool, initializeDatabase } = require('../config/database');
const StringAnalyzer = require('../utils/stringAnalyzer');

describe('String Analyzer API', () => {
  beforeAll(async () => {
    // Initialize database before tests
    await initializeDatabase();
    // Clear the database before tests
    await pool.execute('DELETE FROM strings');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /strings', () => {
    it('should analyze a new string and return 201', async () => {
      const response = await request(app)
        .post('/strings')
        .send({ value: 'Test string' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.value).toBe('Test string');
      expect(response.body.properties).toHaveProperty('length', 11);
      expect(response.body.properties).toHaveProperty('is_palindrome', false);
      expect(response.body.properties).toHaveProperty('word_count', 2);
      expect(response.body.properties).toHaveProperty('sha256_hash');
      expect(response.body.properties).toHaveProperty('character_frequency_map');
    });

    it('should return 409 for duplicate string', async () => {
      await request(app)
        .post('/strings')
        .send({ value: 'Duplicate test' });

      const response = await request(app)
        .post('/strings')
        .send({ value: 'Duplicate test' })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
    });

    it('should return 400 for missing value field', async () => {
      const response = await request(app)
        .post('/strings')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should return 422 for non-string value', async () => {
      const response = await request(app)
        .post('/strings')
        .send({ value: 123 })
        .expect(422);

      expect(response.body).toHaveProperty('error', 'Unprocessable Entity');
    });
  });

  describe('GET /strings/:string_value', () => {
    it('should return string analysis for existing string', async () => {
      const testString = 'Hello World';
      await request(app).post('/strings').send({ value: testString });

      const response = await request(app)
        .get(`/strings/${encodeURIComponent(testString)}`)
        .expect(200);

      expect(response.body.value).toBe(testString);
      expect(response.body.properties.length).toBe(11);
      expect(response.body.properties.word_count).toBe(2);
    });

    it('should return 404 for non-existent string', async () => {
      const response = await request(app)
        .get('/strings/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });

  describe('GET /strings with filtering', () => {
    beforeEach(async () => {
      await pool.execute('DELETE FROM strings');
      
      // Add test data
      const testStrings = [
        'a',
        'racecar',
        'hello world',
        'test string with more words',
        'A man a plan a canal Panama'
      ];

      for (const str of testStrings) {
        await request(app).post('/strings').send({ value: str });
      }
    });

    it('should filter by palindrome', async () => {
      const response = await request(app)
        .get('/strings?is_palindrome=true')
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
      response.body.data.forEach(item => {
        expect(item.properties.is_palindrome).toBe(true);
      });
    });

    it('should filter by length range', async () => {
      const response = await request(app)
        .get('/strings?min_length=5&max_length=15')
        .expect(200);

      response.body.data.forEach(item => {
        expect(item.properties.length).toBeGreaterThanOrEqual(5);
        expect(item.properties.length).toBeLessThanOrEqual(15);
      });
    });

    it('should filter by word count', async () => {
      const response = await request(app)
        .get('/strings?word_count=2')
        .expect(200);

      response.body.data.forEach(item => {
        expect(item.properties.word_count).toBe(2);
      });
    });

    it('should filter by containing character', async () => {
      const response = await request(app)
        .get('/strings?contains_character=e')
        .expect(200);

      response.body.data.forEach(item => {
        expect(item.value.toLowerCase()).toContain('e');
      });
    });
  });

  describe('GET /strings/filter-by-natural-language', () => {
    beforeEach(async () => {
      await pool.execute('DELETE FROM strings');
      
      const testStrings = [
        'a',
        'racecar',
        'hello',
        'test string',
        'longer test string here'
      ];

      for (const str of testStrings) {
        await request(app).post('/strings').send({ value: str });
      }
    });

    it('should parse "palindromic strings" query', async () => {
      const response = await request(app)
        .get('/strings/filter-by-natural-language?query=palindromic%20strings')
        .expect(200);

      expect(response.body.interpreted_query.parsed_filters.is_palindrome).toBe(true);
    });

    it('should parse "strings longer than 5 characters" query', async () => {
      const response = await request(app)
        .get('/strings/filter-by-natural-language?query=strings%20longer%20than%205%20characters')
        .expect(200);

      expect(response.body.interpreted_query.parsed_filters.min_length).toBe(6);
    });

    it('should parse "single word strings" query', async () => {
      const response = await request(app)
        .get('/strings/filter-by-natural-language?query=single%20word%20strings')
        .expect(200);

      expect(response.body.interpreted_query.parsed_filters.word_count).toBe(1);
    });

    it('should return 400 for missing query', async () => {
      await request(app)
        .get('/strings/filter-by-natural-language')
        .expect(400);
    });
  });

  describe('DELETE /strings/:string_value', () => {
    it('should delete existing string', async () => {
      const testString = 'To be deleted';
      await request(app).post('/strings').send({ value: testString });

      await request(app)
        .delete(`/strings/${encodeURIComponent(testString)}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/strings/${encodeURIComponent(testString)}`)
        .expect(404);
    });

    it('should return 404 for non-existent string', async () => {
      await request(app)
        .delete('/strings/nonexistent')
        .expect(404);
    });
  });
});

describe('StringAnalyzer Utility', () => {
  test('should correctly identify palindrome', () => {
    expect(StringAnalyzer.isPalindrome('racecar')).toBe(true);
    expect(StringAnalyzer.isPalindrome('A man a plan a canal Panama')).toBe(true);
    expect(StringAnalyzer.isPalindrome('hello')).toBe(false);
  });

  test('should count unique characters correctly', () => {
    expect(StringAnalyzer.countUniqueCharacters('hello')).toBe(4);
    expect(StringAnalyzer.countUniqueCharacters('aabbcc')).toBe(3);
  });

  test('should count words correctly', () => {
    expect(StringAnalyzer.countWords('hello world')).toBe(2);
    expect(StringAnalyzer.countWords('  multiple   spaces  ')).toBe(2);
  });

  test('should generate correct SHA256 hash', () => {
    const hash = StringAnalyzer.generateSHA256('test');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  test('should parse natural language queries correctly', () => {
    expect(StringAnalyzer.parseNaturalLanguageQuery('palindromic strings')).toEqual({
      is_palindrome: true
    });

    expect(StringAnalyzer.parseNaturalLanguageQuery('strings longer than 5 characters')).toEqual({
      min_length: 6
    });

    expect(StringAnalyzer.parseNaturalLanguageQuery('single word strings')).toEqual({
      word_count: 1
    });

    expect(StringAnalyzer.parseNaturalLanguageQuery('strings with letter a')).toEqual({
      contains_character: 'a'
    });
  });
});