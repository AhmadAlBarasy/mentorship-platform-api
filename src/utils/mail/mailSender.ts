import dotenv from 'dotenv';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

dotenv.config({ path: './config/.env' });

async function sendEmail(content: any) {

  const res =  await resend.emails.send({
    from: content.from,
    to: 'growtlyp@gmail.com',
    subject: content.subject,
    text: content.text,
  });

  console.log(res);

}

export default sendEmail;
