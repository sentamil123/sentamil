# Nexto

Nexto is an Instagram-inspired social application built with Node.js, Express, PostgreSQL, HTML, CSS and vanilla JavaScript.

## Run locally

1. Install Node.js 18 or newer.
2. Create a PostgreSQL database.
3. In this folder, set environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: random secret with at least 32 characters
   - `NODE_ENV=production` when deployed
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open `http://localhost:3000`.

The server creates the required tables on startup.

## Implemented backend

- Account registration and login with bcrypt password hashing
- Signed seven-day JWT sessions
- Profile editing (display name, username, bio and small profile image)
- Persistent posts (text, image and short video/Reel)
- Like/unlike, comment, save/unsave and delete-own-post endpoints
- Follow/unfollow with real database follower/following relationships
- User search and followers/following lists
- Request rate limits, security headers, input validation and parameterized SQL
- Health check at `/api/health`

## Media storage note

For this MVP, small media files are stored as data URLs in PostgreSQL. The browser upload controls limit file size to keep this manageable. A larger public release should use dedicated object storage (for example, an S3-compatible service or Cloudinary) and store only media URLs in PostgreSQL.

## Current limitations

- Direct messaging, story creation/viewer with 24-hour expiry, notifications, password reset/email verification, account reporting/blocking and admin moderation still need implementation.
- There is no automated test suite or production security audit yet.
- Render's free web services may sleep, and free database plans have their own limits/expiry policies. Confirm current plan terms before relying on them for permanent data.
- Do not publish production secrets in GitHub. Configure `DATABASE_URL` and `JWT_SECRET` in the hosting dashboard.

This is a growing MVP, not yet equivalent to Instagram's scale or production readiness.
