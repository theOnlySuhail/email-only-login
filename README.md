# Email-only login

Email-only authentication practice for EYouth Academy. The app uses Express, PostgreSQL, JWTs, and Nodemailer to send one-time login codes.

<div style="border: 1px solid #d1242f; border-left: 5px solid #d1242f; padding: 12px; color: #d1242f;">
  <strong>Important:</strong> This project is for learning. It is not ready for production use.
</div>

## Setup

Install dependencies:

```sh
pnpm install
```

Create `.env` in the project root:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/eyouth_auth
ACCESS_TOKEN_SECRET=replace-with-at-least-32-characters
REFRESH_TOKEN_SECRET=replace-with-at-least-32-characters
GMAIL_USER=you@gmail.com
GMAIL_APP_PASS=your-16-character-app-password
```

Create the PostgreSQL table:

```sql
CREATE TABLE IF NOT EXISTS email_users (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(320) UNIQUE,
  refresh_token TEXT
);
```

Start the server:

```sh
pnpm dev
```

The app runs at `http://localhost:3000` by default.

## Routes

- `/login` sends an OTP to the submitted email address.
- `/verify-otp` verifies the OTP and creates a session.
- `/home` displays the authenticated user.
- `/logout` clears the session.

## Project layout

- `app.ts` contains routes and server startup.
- `config/` validates environment variables and defines token expiration periods.
- `db/` contains PostgreSQL queries.
- `mailer.ts` configures Gmail delivery.
- `middleware/` validates authentication cookies.
- `pages/` contains the HTML pages.
- `types/` contains request and token types.


