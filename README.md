# Kaamkaaj — Blue-collar services & booking platform

A responsive Express/EJS/MongoDB starter with separate **Consumer** and **Service Provider** accounts, protected dashboards, searchable professional profiles, and booking requests.

## Features

- Consumer and Service Provider roles selected with horizontal radio cards during registration
- Password hashing with bcrypt
- Session-based authentication stored in MongoDB when `MONGODB_URI` is configured
- Authenticated users can continue using the public Home page without logging out
- Navbar dashboard icon/link opens the correct dashboard for the signed-in role
- Separate consumer and provider dashboards
- Editable consumer and professional profiles
- Search/filter providers by service, skill, and city
- Consumers request a booking with date, time, address, and notes
- Providers accept, decline, or complete their own booking requests
- Responsive custom CSS, no frontend build step required
- Safe flash messages and error/404 pages

## Requirements

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string

## Setup on macOS / Windows

1. Extract `kaamkaaj.zip` and open the `kaamkaaj` folder in VS Code.
2. Install packages:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and edit it:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/kaamkaaj
   SESSION_SECRET=use-a-long-random-secret-here
   ```

   If using MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string. Never commit `.env`.

4. Start MongoDB locally before running the app. If MongoDB is already running, skip this step.
5. Start the project:

   ```bash
   npm run dev
   ```

6. Open **http://localhost:3000**

## Quick test flow

1. Register an account as **Consumer**.
2. Register another account with a different email as **Service provider**.
3. In the provider account, open **My profile**, add a city, profession, skills, rate, bio, and enable availability.
4. Log in as consumer, open **Find services**, view the provider, and request a booking.
5. Log in as the provider and accept/decline/complete the request from the provider dashboard.
6. While logged in, use **Home** normally. The dashboard icon remains in the navbar and sends you to the dashboard matching your role.

## Routes

| Route | Purpose |
|---|---|
| `/` | Public home page |
| `/register`, `/login` | Authentication |
| `/logout` | Log out (POST) |
| `/providers` | Search providers |
| `/providers/:id` | Provider profile and booking form |
| `/profile` | Role-specific profile editor |
| `/dashboard` | Redirect to the current user's dashboard |
| `/consumer-dashboard` | Consumer dashboard |
| `/provider-dashboard` | Service provider dashboard |

## Important notes

- This is a full runnable starter, not a deployed production service. Configure a strong `SESSION_SECRET`, HTTPS, rate limiting, CSRF protection, email verification, and a privacy policy before public production use.
- `MONGODB_URI` must point to a running MongoDB instance. A connection-refused error usually means MongoDB isn't running or the URI/port is incorrect.
- Google OAuth and image uploads are not included in this clean baseline; no OAuth credentials or image-hosting keys are needed to run it.
# KaamKaaj-help
# Kaamkaaj-help
