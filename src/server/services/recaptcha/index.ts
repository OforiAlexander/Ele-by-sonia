import axios from 'axios';

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const { data } = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify', // remove from here
    null,
    {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token,
      },
    }
  );
  return data.success === true;
}
