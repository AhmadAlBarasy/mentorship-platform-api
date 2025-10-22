const FRONTEND_URL: string = process.env.FRONTEND_URL || 'http://localhost:5173';

const emailVerficationLinkTemplate = (name: string, email: string, code: string) => {
  const verficationLink = `${FRONTEND_URL}/confirm-email?code=${code}`
  return {
    from: process.env.GMAIL_ADDRESS,
    to: email,
    subject: 'Your confirmation code',
    text: `Hey ${name.split(' ')[0]}!\nThanks for signing up to Growthly!\n Use the following link to confirm your email: ${verficationLink}`,
  }
};

const resetPasswordTemplate = (name: string, email: string, code: string) => {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${code}`;
  return {
    from: process.env.GMAIL_ADDRESS,
    to: email,
    subject: 'Reset your password',
    text: `Hey ${name.split(' ')[0]}!\nUse the following link to reset your password: ${resetLink}\n This link will exprire in 10 minutes.`,
  }
};
export {
  emailVerficationLinkTemplate,
  resetPasswordTemplate,
};
