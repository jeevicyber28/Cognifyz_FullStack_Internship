class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, "NOT_FOUND");
  }
}

class RateLimitError extends AppError {
  constructor(retryAfterSeconds) {
    super(
      `Rate limit exceeded. Retry in ${retryAfterSeconds} second(s).`,
      429,
      "RATE_LIMIT_EXCEEDED",
      { retryAfterSeconds }
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class UpstreamApiError extends AppError {
  constructor(serviceName, message) {
    super(`${serviceName} unavailable: ${message}`, 502, "UPSTREAM_API_ERROR", {
      service: serviceName
    });
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  if (err instanceof RateLimitError) {
    res.setHeader("Retry-After", String(err.retryAfterSeconds));
  }

  res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Unexpected server error.",
      details: err.details || null,
      requestId: req.requestId || null
    }
  });
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  UpstreamApiError,
  errorHandler
};
