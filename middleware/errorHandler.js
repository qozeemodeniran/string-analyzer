function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Database errors
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(500).json({
      error: 'Database Connection Error',
      message: 'Unable to connect to database'
    });
  }

  if (err.code === 'ER_BAD_DB_ERROR') {
    return res.status(500).json({
      error: 'Database Error',
      message: 'Database does not exist'
    });
  }

  // Use the status from the error if available, otherwise default to 500
  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    error: getErrorTitle(status),
    message: err.message || 'Internal Server Error'
  });
}

function getErrorTitle(status) {
  const titles = {
    400: 'Bad Request',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error'
  };
  
  return titles[status] || 'Error';
}

module.exports = errorHandler;