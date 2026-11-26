# Task 8: Advanced Server-Side Functionality

An operations server workbench demonstrating request processing middleware, a disk-persisted background job queue with retries, and an LRU/TTL server-side cache.

## Features
- **Middleware Pipeline (`middleware/requestContext.js`):** Injects `X-Request-Id`, measures response latency (`X-Response-Time`), appends structured entries to `logs/requests.jsonl`, and enforces JSON payload limits.
- **Background Job Queue (`queue/jobQueue.js`):** Asynchronous worker pool (`concurrency = 2`) with priority scheduling, exponential backoff retries, real CSV export generation under `storage/exports/`, and disk state recovery in `data/jobs.json`.
- **Server-Side Caching (`cache/cacheStore.js`):** Bounded LRU + TTL cache emitting `X-Cache: HIT | MISS`, `X-Cache-TTL-Remaining`, and `Cache-Control` headers with live hit-rate and latency comparison metrics.

## Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3008`.
