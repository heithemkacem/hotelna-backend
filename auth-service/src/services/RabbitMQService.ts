import amqp, { Channel, Connection } from "amqplib";
import config from "../config/config";
import { Profile } from "../database";
import { ApiError } from "../utils";

class RabbitMQService {
  private requestQueue = "USER_DETAILS_REQUEST";
  private responseQueue = "USER_DETAILS_RESPONSE";
  private emailQueue = "EMAIL_NOTIFICATION_QUEUE";
  private smsQueue = "SMS_NOTIFICATION_QUEUE";
  private connection!: Connection;
  private channel!: Channel;

  constructor() {
    this.init();
  }

  async init() {
    try {
      this.connection = await amqp.connect(config.msgBrokerURL!);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue(this.requestQueue);
      await this.channel.assertQueue(this.responseQueue);
      await this.channel.assertQueue(this.emailQueue);
      await this.channel.assertQueue(this.smsQueue);
      process.on("SIGINT", () => this.shutdown());
      process.on("SIGTERM", () => this.shutdown());
      this.listenForRequests();
    } catch (error) {
      console.error("Failed to initialize RabbitMQ connection:", error);
    }
  }
  private async listenForRequests() {
    this.channel.consume(this.requestQueue, async (msg) => {
      if (msg && msg.content) {
        const { userId } = JSON.parse(msg.content.toString());
        console.log(msg);
        console.log("rabbitMQ user id in the auth", userId);
        const userDetails = await getUserDetails(userId);

        // Send the user details response
        this.channel.sendToQueue(
          this.responseQueue,
          Buffer.from(JSON.stringify(userDetails)),
          { correlationId: msg.properties.correlationId }
        );

        // Acknowledge the processed message
        this.channel.ack(msg);
      }
    });
  }

  async sendEmailNotification(to: string, subject: string, body: string) {
    const message = { to, subject, body };
    this.channel.sendToQueue(
      this.emailQueue,
      Buffer.from(JSON.stringify(message))
    );
    console.log("Email notification request sent");
  }
  async sendSMSNotification(to: string) {
    const message = { to };
    console.log(message, "message");
    this.channel.sendToQueue(
      this.smsQueue,
      Buffer.from(JSON.stringify(message))
    );
    console.log("SMS notification request sent");
  }
  private async shutdown() {
    try {
      await this.channel.close();
      await this.connection.close();
      console.log("RabbitMQ connection closed gracefully");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  }
}

const getUserDetails = async (userId: string) => {
  const userDetails = await Profile.findById(userId).select("-password");
  if (!userDetails) {
    throw new ApiError(404, "User not found");
  }

  return userDetails;
};
export const rabbitMQService = new RabbitMQService();
