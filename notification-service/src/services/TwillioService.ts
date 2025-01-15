import config from "../config/config";
import { rabbitMQService } from "./RabbitMQService";
const client = require("twilio")(
  config.twillio.accountSid,
  config.twillio.authToken
);
export class TwillioService {
  private client;

  constructor() {
    this.client = client;
  }

  async sendSMS(to: string, message: string) {
    console.log(client, "client");
    try {
      console.log(to, "to");
      client.messages
        .create({
          to: to,
          from: "+21625711161",
          body: message,
        })
        .then((message: any) => console.log(message, "message"));
    } catch (error) {
      console.log("Error sending email:", error);
    }
  }
}
