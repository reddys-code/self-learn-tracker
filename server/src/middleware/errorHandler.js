export function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || 'Unexpected server error',
  });
}
