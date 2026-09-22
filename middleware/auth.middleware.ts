import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { ACCESS_TOKEN_EXPIRATION_PERIOD } from '../config/auth.ts';
import * as db from '../db/index.ts';
import type { AccessToken, OtpToken } from '../types/auth.ts';

/** Redirects authenticated users away from the login page. */
export function alreadyLoggedIn(req: Request, res: Response, next: NextFunction) {
  if (req.cookies.ACCESS_TOKEN) return res.redirect('/home');
  return next();
}

/** Validates the OTP token before showing the code entry page. */
export function validOtpSession(req: Request, res: Response, next: NextFunction) {
  const otpToken = req.cookies.OTP_TOKEN as string | undefined;
  if (!otpToken) return res.redirect('/login');

  try {
    const user = jwt.verify(otpToken, env.ACCESS_TOKEN_SECRET) as OtpToken;
    if (!user.email || !user.otpHash) throw new Error('Invalid OTP token');
    req.user = { email: user.email };
    return next();
  } catch {
    res.clearCookie('OTP_TOKEN');
    return res.redirect('/login');
  }
}

/** Validates the access token and refreshes it when the refresh session is valid. */
export async function validSession(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies.ACCESS_TOKEN as string | undefined;
  if (!accessToken) return res.redirect('/login');

  // Accept a valid access token immediately.
  try {
    const user = jwt.verify(accessToken, env.ACCESS_TOKEN_SECRET) as AccessToken;
    req.user = { email: user.email };
    return next();
  } catch (error) {
    if (!(error instanceof jwt.TokenExpiredError)) {
      res.clearCookie('ACCESS_TOKEN');
      return res.redirect('/login');
    }
  }

  // Expired access tokens can continue if the stored refresh token is valid.
  const decoded = jwt.decode(accessToken) as AccessToken | null;
  if (!decoded?.email) return res.redirect('/login');
  const refreshToken = await db.findRefreshToken(decoded.email);
  try {
    if (!refreshToken) throw new Error('Missing refresh token');
    jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
  } catch {
    await db.clearRefreshToken(decoded.email);
    res.clearCookie('ACCESS_TOKEN');
    return res.redirect('/login');
  }

  // Rotate the short-lived access token after refreshing the session.
  const newAccessToken = jwt.sign({ email: decoded.email }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION_PERIOD,
  });
  console.log(`ACCESS_TOKEN refreshed for ${decoded.email}`);
  

  res.cookie('ACCESS_TOKEN', newAccessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });
  req.user = { email: decoded.email };

  return next();
}
