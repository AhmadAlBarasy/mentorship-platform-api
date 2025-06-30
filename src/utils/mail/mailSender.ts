import { google } from 'googleapis';
import dotenv from 'dotenv';
import { SendMailOptions } from 'nodemailer';

dotenv.config({ path: './config/.env' });

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!,
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
});

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

function createRawTextMessage({ from, to, subject, text }: SendMailOptions): string {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    text || '',
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendEmail(content: SendMailOptions) {
  const rawMessage = createRawTextMessage({
    from: content.from || `Growthly Platform <${process.env.GMAIL_ADDRESS}>`,
    to: content.to,
    subject: content.subject,
    text: content.text as string,
  });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
    },
  });
}

export default sendEmail;
