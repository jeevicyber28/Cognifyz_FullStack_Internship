# Cognifyz Full Stack Development Internship

Completed projects across all 4 levels (8 tasks) of the Cognifyz Technologies Full Stack Development Internship program. Each level is organized into a separate folder with standalone runnable applications, documentation, and verification outputs.

## Task Directory

| Level | Task | Project | Port | Core Stack |
|---|---|---|---|---|
| **Level 1: Beginner** | Task 1 | [Department Workshop RSVP](Level_1_Beginner/Task_1_SSR_Forms/) | `3001` | HTML5 Forms, Express, EJS SSR |
| **Level 1: Beginner** | Task 2 | [Project Quote & Validation Intake](Level_1_Beginner/Task_2_Inline_Validation/) | `3002` | Inline CSS, Inline JS, Server Validation, In-Memory Store |
| **Level 2: Intermediate** | Task 3 | [Filter & Press Roastery Showcase](Level_2_Intermediate/Task_3_Responsive_Layout/) | `3003` | Bootstrap 5.3, Custom CSS Transitions & Keyframes |
| **Level 2: Intermediate** | Task 4 | [DevPortal Workspace Onboarding](Level_2_Intermediate/Task_4_Dynamic_Validation_Routing/) | `3004` | Password Strength Engine, Dynamic DOM, History API Router |
| **Level 3: Advanced** | Task 5 | [TrackDesk Issue Tracker](Level_3_Advanced/Task_5_REST_API_CRUD/) | `3005` | RESTful CRUD API, Fetch Client, JSON File Persistence |
| **Level 3: Advanced** | Task 6 | [PocketLedger Expense Book](Level_3_Advanced/Task_6_Database_Auth/) | `3006` | SQLite (`sql.js`), `bcryptjs`, JWT `httpOnly` Cookies |
| **Level 4: Expert** | Task 7 | [Skyline Brief Weather & OAuth Hub](Level_4_Expert/Task_7_External_API_OAuth/) | `3007` | OAuth 2.0 Code Flow, Open-Meteo API, Rate Limiter |
| **Level 4: Expert** | Task 8 | [DataPulse Queue & Cache Server](Level_4_Expert/Task_8_Middleware_Jobs_Cache/) | `3008` | Middleware Logging, Persistent Job Queue, LRU/TTL Cache |

## Running Any Task

Navigate into any task directory and start the Express server:

```bash
cd Level_1_Beginner/Task_1_SSR_Forms
npm install
npm start
```

Each task runs on its own port (`3001` through `3008`) so multiple levels can be demonstrated simultaneously without port conflicts.
