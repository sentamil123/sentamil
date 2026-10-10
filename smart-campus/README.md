# Smart Campus Management System

A responsive college-operations dashboard prototype built with Node.js, Express, HTML, CSS and vanilla JavaScript.

## Modules
- Overview dashboard with attendance trend, department indicators and sample KPIs
- Student directory with search, department filter and add-student form
- Attendance risk view for records below the 75% threshold
- Timetable / academics page
- Notices and events board with demo notice creation
- Operations task checklist with completion updates
- Department overview and CSV reports
- Health endpoint at `/api/health`

## Run locally
Requirements: Node.js 20+

```bash
cd smart-campus
npm install
npm start
```

Open http://localhost:3000.

## Deployment
Render can build from the repository root with:
- Build command: `npm install --prefix smart-campus`
- Start command: `npm --prefix smart-campus start`
- Region: Singapore
- Plan: Free

## Important limitations
This is a project demo, not a production-ready student information system. The sample names and KPIs are fictional/illustrative. Without a persistent database, the JSON data store may reset or be lost when the hosting instance restarts or redeploys. Do not enter real student personal data.

Before a real college rollout, implement PostgreSQL migrations and backups, institutional identity/SSO or secure authentication, role-based permissions, audit logs, input validation and rate limiting, secure secrets, privacy/data-retention controls, accessibility testing, automated tests, and a formal security review. Never use this demo as the official record system.
