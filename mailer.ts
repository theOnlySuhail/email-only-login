import nodemailer from 'nodemailer';
import { env } from './config/env.ts';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASS,
  },
});

export default transporter;
