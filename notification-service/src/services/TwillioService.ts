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

  async sendSMS(to: string) {
    console.log(client, "client");
    try {
      console.log(to, "to");
      client.verify.v2
        .services("VAc63d1f07fcc93b825f7247604322308d")
        .verifications.create({ to: to, channel: "sms" })

        .then((verification: any) => console.log(verification, "verification"));
    } catch (error) {
      console.log("Error sending email:", error);
    }
  }
  async verifySMS(to: string, code: string) {
    try {
      const verification = await client.verify.v2
        .services("VAc63d1f07fcc93b825f7247604322308d")
        .verificationChecks.create({ to: to, code: code });
      if (verification.status === "approved") {
        rabbitMQService.sendVerificationFailedNotifications(true);
      } else {
        rabbitMQService.sendVerificationFailedNotifications(false);
      }
    } catch (error) {
      const correlationId = this.generateUniqueId();
      console.log("Error verifying SMS:", error);
      rabbitMQService.sendVerificationFailedNotifications(false);
    }
  }
  generateUniqueId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
