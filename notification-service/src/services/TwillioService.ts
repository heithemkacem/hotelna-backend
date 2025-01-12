import config from "../config/config";
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
      console.error("Error sending email:", error);
    }
  }
}
