import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });


const client = new OAuth2Client();

const getGoogleUserData = async (idToken: string) => {
  const path = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
  const res = await axios.get(path);
  return res.data;
};

const getGoogleTokens = async(authorizationCode: string) => {
  const { data } = await axios.post("https://oauth2.googleapis.com/token", null, {
    params: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: authorizationCode,
      grant_type: "authorization_code",
      redirect_uri: process.env.GOOGLE_AUTH_REDIRECT_URI,
    },
  });
  return data;
}

export { getGoogleUserData, getGoogleTokens };