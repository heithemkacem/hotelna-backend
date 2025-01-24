import amqp, { Channel } from "amqplib";
import config from "../config/config";
import { ExpoPushService } from "./ExpoPushService";
import { EmailService } from "./EmailService";
import { TwillioService } from "./TwillioService";

class RabbitMQService {
  private channel!: Channel;
  private expoPushService = new ExpoPushService();
  private emailService = new EmailService();
  private twillioService = new TwillioService();

  constructor() {
    this.init();
  }

  async init() {
    const connection = await amqp.connect(config.msgBrokerURL!);
    this.channel = await connection.createChannel();
    await this.channel.assertQueue(config.queue.notifications);
    await this.channel.assertQueue(config.queue.emailQueue);
    await this.channel.assertQueue(config.queue.smsQueue);
    await this.channel.assertQueue(config.queue.sendNotificationQueue);
    await this.consumeNotification();
    await this.consumeEmailNotifications();
    await this.consumeSMSNotifications();
    await this.consumeSendNotification();
  }

  async consumeNotification() {
    await this.channel.assertQueue(config.queue.notifications);
    this.channel.consume(config.queue.notifications, async (msg) => {
      if (msg) {
        const { type, message, userEmail, userToken, fromName } = JSON.parse(
          msg.content.toString()
        );

        if (type === "MESSAGE_RECEIVED") {
          console.log(userToken);
          if (userToken !== "not_available") {
            await this.expoPushService.sendPushNotification(
              userToken,
              "A new message from " + fromName,
              message,
              {
                type: "MESSAGE_RECEIVED",
                fromName,
                message,
              }
            );
          } else if (userEmail) {
            // User is offline, send an email
            await this.emailService.sendEmail(
              userEmail,
              `New Message from ${fromName}`,
              message
            );
          }
        }

        this.channel.ack(msg); // Acknowledge the message after processing
      }
    });
  }
  async consumeEmailNotifications() {
    this.channel.consume(config.queue.emailQueue, async (msg) => {
      if (msg) {
        const { to, subject, body } = JSON.parse(msg.content.toString());
        await this.emailService.sendEmail(to, subject, body);
        console.log(`Email sent to ${to}`);
        this.channel.ack(msg);
      }
    });
  }
  async consumeSMSNotifications() {
    this.channel.consume(config.queue.smsQueue, async (msg) => {
      if (msg) {
        const { to, message } = JSON.parse(msg.content.toString());
        await this.twillioService.sendSMS(to, message);
        console.log(`SMS sent to ${to}`);
        this.channel.ack(msg);
      }
    });
  }

  async consumeSendNotification() {
    this.channel.consume(config.queue.sendNotificationQueue, async (msg) => {
      if (msg) {
        const { to, title, body, data } = JSON.parse(msg.content.toString());
        await this.expoPushService.sendPushNotification(to, title, body, data);
        this.channel.ack(msg);
      }
    });
  }
}

export const rabbitMQService = new RabbitMQService();
