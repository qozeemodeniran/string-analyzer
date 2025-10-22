# String Analyzer Service

A RESTful API service that analyzes strings and stores their computed properties. Built with Node.js, Express, and MySQL, deployed on Heroku with JawsDB.

## Features

- Analyze string properties (length, palindrome status, unique characters, word count, SHA-256 hash, character frequency)
- Store and retrieve string analyses
- Filter strings by various criteria
- Natural language query support
- RESTful API design

## API Endpoints

### 1. Create/Analyze String
**POST** `/strings`
```json
{
  "value": "string to analyze"
}

