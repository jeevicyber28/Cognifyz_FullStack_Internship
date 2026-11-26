# Task 1: HTML Structure and Basic Server Interaction

A server-rendered campus workshop registration desk built with Express and EJS.

## What Was Implemented
- Semantic HTML5 form structure (`fieldset`, `legend`, labeled text/email inputs, dropdowns, radio buttons, and notes textarea) in `views/index.ejs`.
- Express server in `server.js` handling URL-encoded form submissions (`POST /register`), home page rendering (`GET /`), and filtered attendee listing (`GET /attendees`).
- Dynamic server-side HTML generation with EJS templates (`views/confirmation.ejs` and `views/attendees.ejs`).

## Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3001` in your browser.
