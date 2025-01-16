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
  async sendVerification(to: string) {
    try {
      await client.verify.v2
        .services("VAc63d1f07fcc93b825f7247604322308d")
        .verifications.create({ to: "+21625711161", channel: "sms" })
        .then((verification: any) => console.log(verification.sid));
    } catch (error) {
      console.log("Error verifying SMS:", error);
      return false;
    }
  }
  async verifySMS(to: string, code: string) {
    try {
      const verification = await client.verify.v2
        .services("VAc63d1f07fcc93b825f7247604322308d")
        .verificationChecks.create({ to: to, code: code });
      if (verification.status === "approved") {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log("Error verifying SMS:", error);
      return false;
    }
  }
}
