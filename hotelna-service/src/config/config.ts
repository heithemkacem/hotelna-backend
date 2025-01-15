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
} = process.env;
const queue = {
  emailQueue: "EMAIL_NOTIFICATION_QUEUE",
  sendNotificationQueue: "SEND_NOTIFICATION_QUEUE",
};
export default {
  MONGO_URI,
  PORT,
  JWT_SECRET,
  env: NODE_ENV,
  msgBrokerURL: MESSAGE_BROKER_URL,
  limit,
  RESET_PASSWORD_SECRET,
  queue,
};
