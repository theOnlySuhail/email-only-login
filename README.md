# Email-only login

This project is a small authentication exercise for EYouth Academy. It logs users in with a one-time code sent to their email address.

The app uses Express, PostgreSQL, JSON Web Tokens, and Nodemailer. It stores the refresh token in PostgreSQL and keeps the access, refresh, and OTP tokens in HTTP-only cookies.

This project is for learning. It is not ready to use as a production authentication service.

## Setup

Install the dependencies from the project root:

```sh
pnpm install
```

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/eyouth_auth
ACCESS_TOKEN_SECRET=replace-with-at-least-32-characters
REFRESH_TOKEN_SECRET=replace-with-at-least-32-characters
GMAIL_USER=you@example.com
GMAIL_APP_PASS=your-16-character-app-password
```

The Gmail account must have an app password available for Nodemailer.

Create the PostgreSQL table used by the app:

```sql
CREATE TABLE IF NOT EXISTS email_users (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(320) UNIQUE,
  refresh_token TEXT
);
```

Start the development server:

```sh
pnpm dev
```

The app runs at `http://localhost:3000` by default.

## How it works

1. The user submits an email address at `/login`.
2. The app creates the user if needed and sends a six-digit OTP by email.
3. The user submits the OTP at `/verify-otp`.
4. The app stores a refresh token in PostgreSQL and sets an access-token cookie.
5. The authenticated user can open `/home` or log out with `/logout`.

## Project layout

- `index.ts` contains the Express routes and server startup.
- `config/env.ts` validates environment variables.
- `config/auth.ts` defines token expiration periods.
- `db/index.ts` contains PostgreSQL queries for users and refresh tokens.
- `mailer.ts` configures Gmail delivery through Nodemailer.
- `middleware/auth.middleware.ts` validates OTP, access, and refresh sessions.
- `pages/` contains the login, OTP verification, and home pages.
- `types/` contains request and token types.

## Checks

Run the TypeScript compiler without emitting files:

```sh
pnpm exec tsc --noEmit
```
