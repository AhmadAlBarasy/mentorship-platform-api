const confirmationCodeTemplate = (name: string, email: string, code: string) => {
  return {
    from: 'no-reply@mentorplatform.com',
    to: email,
    subject: 'Your confirmation code',
    text: `Hey ${name.split(' ')[0]}!\nThanks for signing up to our platform. Your confirmation code is ${code}.`,
  }
};

const resetPasswordTemplate = (name: string, email: string, code: string) => {
  let host;
  if (process.env.NODE_ENV === 'development') {
    host = `localhost:${process.env.PORT}/auth/reset-password`;
  } else if (process.env.NODE_ENV === 'production'){
    // this is just an example, this is not the actual domain
    host = 'https://mentorplatform.com/auth/reset-password';
  }
  return {
    from: 'no-reply@mentorplatform.com',
    to: email,
    subject: 'Reset your password',
    text: `Hey ${name.split(' ')[0]}!\nUse the following link to reset your password: ${host}/${code}\n This link will exprire in 10 minutes.`,
  }
};
export {
  confirmationCodeTemplate,
  resetPasswordTemplate,
};
