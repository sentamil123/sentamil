# Nexto

Nexto is an Instagram-inspired social media app prototype, built with Node.js, Express, HTML, CSS and vanilla JavaScript.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder run:
   ```bash
   npm install
   npm start
   ```
3. Open `http://localhost:3000`.

## Current prototype features

- Responsive desktop and mobile layouts
- Home feed with sample posts and story bubbles
- Create text posts and attach a small image
- Like, comment, save and delete your own posts
- Follow/unfollow suggested creators
- Search sample people and posts
- Edit local profile
- Explore, saved and profile views
- Health endpoint at `/api/health`

## Important status

This first version is a **front-end prototype**. Posts, likes, follows, comments and profile edits are saved in the browser's local storage on the current device. Sample accounts are mock content; there is no real account system, secure login, cross-device sync, live messaging, or actual video upload yet. Do not enter passwords or sensitive personal data. The Express health endpoint is available for deployment checks.

## Next development phases

1. Add a real database and user registration/login.
2. Add image/video storage with a storage provider.
3. Add follow graph, notifications and direct messaging.
4. Add moderation/reporting tools and an admin dashboard.
5. Add tests, deployment environment variables and production security hardening.

Free hosting and storage tiers have limits and may change. Before a public launch, implement secure authentication, authorization, rate limits, input validation, privacy controls, moderation and persistent storage.
