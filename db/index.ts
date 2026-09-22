import pg from 'pg';
import { env } from '../config/env.ts';
import sql from 'sql-template-tag';

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

/** Creates the users table when it does not already exist. */
export async function initialize() {
  // Keep startup idempotent so existing deployments can be reused.
  await pool.query(sql`
    CREATE TABLE IF NOT EXISTS email_users (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      email VARCHAR(320) UNIQUE,
      refresh_token TEXT
    )
  `);
}

/** Adds an email address to the users table if it is not already present. */
export async function ensureUser(email: string) {
  await pool.query(
    sql`INSERT INTO email_users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
    [email],
  );
}

/** Returns the stored refresh token for an email address, if one exists. */
export async function findRefreshToken(email: string) {
  // A missing user and a user without a token both mean no active session.
  const result = await pool.query<{ refresh_token: string | null }>(
    sql`SELECT refresh_token FROM email_users WHERE email = $1`,
    [email],
  );
  return result.rows[0]?.refresh_token ?? null;
}

/** Stores a refresh token for an email address. */
export async function setRefreshToken(email: string, refreshToken: string) {
  await pool.query(sql`UPDATE email_users SET refresh_token = $1 WHERE email = $2`, [
    refreshToken,
    email,
  ]);
}

/** Removes the stored refresh token for an email address. */
export async function clearRefreshToken(email: string) {
  await pool.query(sql`UPDATE email_users SET refresh_token = NULL WHERE email = $1`, [email]);
}
