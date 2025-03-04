const confirmationCodeTemplate = (name: string, email: string, code: string) => {
  return {
    from: 'no-reply@mentorplatform.com',
    to: email,
    subject: `Your confirmation code`,
    text: `Hey ${name.split(' ')[0]}!\nThanks for signing up to our platform. Your confirmation code is ${code}.`
  }
};

export {
  confirmationCodeTemplate,
};