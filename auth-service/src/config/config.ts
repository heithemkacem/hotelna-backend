import { config } from "dotenv";

const configFile = `./.env`;
config({ path: configFile });

const {
  MONGO_URI,
  PORT,
  JWT_SECRET,
  NODE_ENV,
  MESSAGE_BROKER_URL,
  limit,
  RESET_PASSWORD_SECRET,
  accountSid,
  authToken,
} = process.env;
const queue = {
  requestQueue: "USER_DETAILS_REQUEST",
  responseQueue: "USER_DETAILS_RESPONSE",
  emailQueue: "EMAIL_NOTIFICATION_QUEUE",
  smsQueue: "SMS_NOTIFICATION_QUEUE",
};

export default {
  MONGO_URI,
  PORT,
  JWT_SECRET,
  env: NODE_ENV,
  msgBrokerURL: MESSAGE_BROKER_URL,
  limit,
  RESET_PASSWORD_SECRET,
  twillio: {
    accountSid,
    authToken,
  },
  queue,
};
