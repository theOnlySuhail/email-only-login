import express from 'express';
import type { Request, Response } from 'express';
import transporter from './mailer.ts';
import { env } from './config/env.ts';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as db from './db/index.ts';
import { alreadyLoggedIn, validOtpSession, validSession } from './middleware/auth.middleware.ts';
import {
  OTP_TOKEN_EXPIRATION_PERIOD,
  REFRESH_TOKEN_EXPIRATION_PERIOD,
  ACCESS_TOKEN_EXPIRATION_PERIOD,
} from './config/auth.ts';
import type { LoginBody, OtpBody, OtpToken } from './types/auth.ts';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/login', alreadyLoggedIn, async (_req: Request, res: Response) => {
  return res.send(await fs.readFile(path.join(import.meta.dirname, 'pages/login.html'), 'utf8'));
});

app.post('/login', async (req: Request<{}, {}, LoginBody>, res: Response) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !isEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' });
  await db.ensureUser(email);

  // Create a short-lived token containing only the hashed OTP.
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpToken = jwt.sign({ email, otpHash: hashOtp(otp) }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: OTP_TOKEN_EXPIRATION_PERIOD,
  });

  res.cookie('OTP_TOKEN', otpToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    maxAge: 5 * 60 * 1000,
  });

  // Send the code after storing its verification token in an HTTP-only cookie.
  await transporter.sendMail({
    from: env.GMAIL_USER,
    to: email,
    subject: 'Your login code',
    text: `Your login code is ${otp}. It expires in 5 minutes.`,
  });

  return res.redirect('/verify-otp');
});

app.get('/verify-otp', validOtpSession, async (req: Request, res: Response) => {
  const html = await fs.readFile(path.join(import.meta.dirname, 'pages/verify-otp.html'), 'utf8');
  return res.send(html.replace('{{email}}', escapeHtml(req.user!.email)));
});

app.post('/verify-otp', async (req: Request<{}, {}, OtpBody>, res: Response) => {
  const otpTokenToken = req.cookies.OTP_TOKEN as string | undefined;
  if (!otpTokenToken || !/^\d{6}$/.test(req.body.otp ?? '')) {
    return res.status(400).json({ error: 'Enter the six-digit code from your email.' });
  }

  try {
    // Verify the token and compare the submitted code against its hash.
    const otpToken = jwt.verify(otpTokenToken, env.ACCESS_TOKEN_SECRET) as OtpToken;
    if (!safeEqual(hashOtp(req.body.otp), otpToken.otpHash)) throw new Error('Invalid OTP');
    // await db.ensureUser(otpToken.email);

    // Persist the refresh session and issue a short-lived access token.
    const refreshToken = jwt.sign({ email: otpToken.email }, env.REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRATION_PERIOD,
    });
    await db.setRefreshToken(otpToken.email, refreshToken);

    const accessToken = jwt.sign({ email: otpToken.email }, env.ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRATION_PERIOD,
    });
    res.clearCookie('OTP_TOKEN');

    res.cookie('ACCESS_TOKEN', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.NODE_ENV === 'production',
    });

    return res.redirect('/home');
  } catch {
    res.clearCookie('OTP_TOKEN');
    return res.status(401).json({ error: 'Invalid or expired code.' });
  }
});

app.get('/home', validSession, async (req: Request, res: Response) => {
  const html = await fs.readFile(path.join(import.meta.dirname, 'pages/home.html'), 'utf8');
  return res.send(html.replace('{{email}}', req.user!.email));
});

app.post('/logout', validSession, async (req: Request, res: Response) => {
  await db.clearRefreshToken(req.user!.email);
  res.clearCookie('ACCESS_TOKEN');
  return res.redirect('/login');
});

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/** Compares two strings without exposing timing differences for equal-length values. */
function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

/** Checks whether a value has the expected basic email address shape. */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Escapes user-controlled text before inserting it into HTML. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

app.listen(env.PORT, (err) => {
  if (err) console.log(err.message);
  console.log(`Express server running on port: ${env.PORT}`);
});
