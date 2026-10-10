# Smart Campus Management System

A responsive college website and campus operations demo built with Node.js, Express, HTML, CSS and vanilla JavaScript.

## Public college website
- Responsive college-style homepage with academics, campus life, announcements and portal entry points
- Mobile navigation and accessible form labels/status messaging
- Public overview endpoint for college information and notices

## Student portal
- Student login using a demo student ID
- Personal attendance summary and attendance records
- Department/year timetable, fee total/paid/due, and campus notices

## Staff portal
- Staff login and role-protected dashboard
- Mark attendance and review attendance records
- Add timetable entries
- Record fee payments
- Publish campus notices
- View student/fee records in the demo workspace

## Demo credentials
- Student ID: `STU2401`
- Student password: `STU2401`
- Staff email: `staff@campus.test`
- Staff password: `Staff@123`

These credentials and the sample institution, people, fees, schedules and notices are fictional. Change them before any public demonstration where you do not want demo accounts exposed.

## Run locally
Requirements: Node.js 20+

```bash
cd smart-campus
npm install
npm start
```

Open http://localhost:3000.

## Deployment
Render settings:
- Build command: `npm install --prefix smart-campus`
- Start command: `npm --prefix smart-campus start`
- Region: Singapore
- Plan: Free

## Security and data limitations
This remains a **demo/prototype**, not a production-ready student information system:
- Staff demo passwords are stored as salted scrypt hashes after data migration; login attempts are rate-limited and bearer sessions expire after eight hours.
- Student demo login still uses the student ID as the password. Replace this with individually provisioned, securely hashed passwords or institutional SSO before real use.
- The current JSON file store is not a durable production database. Free hosting may restart or reset local files, and in-memory sessions are lost on restart.
- Do not enter real student records, identity details, payment data or passwords.

Before real college deployment, connect a durable PostgreSQL database, implement proper password reset and account provisioning, audit logging, backups, stronger input validation, tests, privacy/retention controls, accessibility checks, and a security review. Validate every workflow with authorised college staff before relying on the system for official records.
