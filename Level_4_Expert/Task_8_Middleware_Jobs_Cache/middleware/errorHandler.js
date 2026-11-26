function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Malformed JSON request payload.",
      requestId: req.requestId || null
    });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Unexpected server error.",
    requestId: req.requestId || null
  });
}

module.exports = {
  errorHandler
};
