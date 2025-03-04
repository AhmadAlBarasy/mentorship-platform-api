import nodemailer from 'nodemailer';
import dotenv from "dotenv";

dotenv.config({ path: './config/.env' });

const MAIL_HOST: string = process.env.MAIL_HOST || 'host';
const MAIL_PORT: number = Number(process.env.MAIL_PORT) || 587;
const MAIL_USER: string = process.env.MAIL_USER || 'user';
const MAIL_PASSWORD: string = process.env.MAIL_PASSWORD || 'password';

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASSWORD,
  }
});

export default transporter;