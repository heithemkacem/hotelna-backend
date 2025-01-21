import amqp, { Channel, Connection } from "amqplib";
import config from "../config/config";

class RabbitMQService {
  private emailQueue = "EMAIL_NOTIFICATION_QUEUE";
  private connection!: Connection;
  private channel!: Channel;

  constructor() {
    this.init();
  }

  async init() {
    try {
      this.connection = await amqp.connect(config.msgBrokerURL!);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue(this.emailQueue);
      process.on("SIGINT", () => this.shutdown());
      process.on("SIGTERM", () => this.shutdown());
    } catch (error) {
      console.error("Failed to initialize RabbitMQ connection:", error);
    }
  }

  async sendEmailNotification(to: string, subject: string, body: string) {
    const message = { to, subject, body };
    this.channel.sendToQueue(
      this.emailQueue,
      Buffer.from(JSON.stringify(message))
    );
    console.log("Email notification request sent");
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

export const rabbitMQService = new RabbitMQService();
