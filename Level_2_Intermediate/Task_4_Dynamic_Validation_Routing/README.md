# Task 4: Complex Form Validation and Dynamic DOM Manipulation

An engineering workspace onboarding portal implementing multi-rule client validation, live DOM updates, and History API client-side routing.

## Features
- **Complex Validation:** Workspace handle format and reserved-name check, URL parsing, stack tag limits, and 6-rule password strength evaluator.
- **Dynamic DOM Updates:** Live member badge preview updating as you type, interactive tag chips add/remove, and live searchable team directory updates without page reloads.
- **Client-Side Routing:** Navigation across `/onboarding`, `/directory`, and `/policy` via `history.pushState` and `popstate`, with Express fallback for direct refreshes.

## Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3004`.
