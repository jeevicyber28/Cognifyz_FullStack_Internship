# Task 7: Advanced API Usage and External API Integration

A weather and air quality aggregator combining live third-party API calls, OAuth 2.0 Authorization Code flow, sliding-window rate limiting, and centralized error handling.

## Features
- **OAuth 2.0 Authentication:** Supports both a built-in RFC-6749 Authorization Code + Consent Server (`/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`) for zero-setup testing and optional GitHub OAuth 2.0 via `.env`.
- **External API Integration:** Fetches geocoding, current weather, 5-day forecasts, and air quality metrics concurrently from Open-Meteo with `AbortSignal.timeout()` and partial failure tolerance.
- **Rate Limiting & Error Handling:** Sliding-window rate limiter (`10 req/min` guest, `30 req/min` OAuth-authenticated) emitting `X-RateLimit-*` and `Retry-After` headers, paired with structured `AppError` JSON responses and `X-Request-Id` tracing.

## Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3007`.
