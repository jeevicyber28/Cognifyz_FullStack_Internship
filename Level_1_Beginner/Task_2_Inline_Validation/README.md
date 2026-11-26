# Task 2: Inline Styles, Basic Interaction, and Server-Side Validation

A freelance project quote intake form built with inline CSS, inline client-side JavaScript validation, Express server-side validation, and temporary in-memory record storage.

## Key Features
- **Inline Styling:** Custom layout, form controls, error highlights, and sidebar cards styled with inline CSS in `views/quote.ejs`.
- **Inline JavaScript Interactions:** Live budget slider formatting, dynamic conditional URL field for website redesigns, brief character counter, and pre-submit client validation (plus a toggle to bypass client checks and test server rejection directly).
- **Server-Side Validation:** Express validates all fields (`POST /inquiries`), returning HTTP 400 with field-specific errors while preserving user input.
- **Temporary Storage:** Validated inquiries are stored in Express runtime memory with delete support (`POST /inquiries/:id/delete`).

## Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3002`.
