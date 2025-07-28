import axios, { AxiosError } from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

export const sendOTPEmail = async(to: string, otp: string) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: to }],
        subject: 'Your Verification Code',
        htmlContent: `<p>Your OTP is <strong>${otp}</strong>. It will expire in 15 minutes.</p>`,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY as string,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Brevo email sent:', response.data);
  } catch (err: unknown) {
    const error = err as AxiosError;
    console.error('Brevo email failed:', error.response?.data || error.message);
    throw new Error('Failed to send OTP email');
  }

};
