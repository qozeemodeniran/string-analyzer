# String Analyzer Service

A RESTful API service that analyzes strings and stores their computed properties.

## Features

- Analyze strings and compute various properties
- Store and retrieve string analyses
- Filter strings by multiple criteria
- Natural language query support
- SHA256-based unique identification

## API Endpoints

### POST /strings
Analyze a new string and store its properties.

### GET /strings/{string_value}
Retrieve analysis for a specific string.

### GET /strings
Get all strings with optional filtering.

### GET /strings/filter-by-natural-language
Filter strings using natural language queries.

### DELETE /strings/{string_value}
Delete a string from the system.

## Local Development

### Prerequisites
- Node.js (v14 or higher)
- MySQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd string-analyzer-service