# Task 5: API Integration and Front-End Interaction

A full-stack CRUD issue tracker with a RESTful Express JSON API, persistent file storage, and a Fetch-driven front end.

## API Endpoints
- `GET /api/issues` &mdash; list issues with optional `status`, `priority`, and `q` query filters.
- `GET /api/issues/:id` &mdash; fetch a single issue record.
- `POST /api/issues` &mdash; create a new issue (returns `201 Created`).
- `PUT` / `PATCH /api/issues/:id` &mdash; update issue details or status.
- `DELETE /api/issues/:id` &mdash; delete an issue record.

## Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3005`.
