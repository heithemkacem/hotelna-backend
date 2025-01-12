import amqp, { Channel } from "amqplib";
import config from "../config/config";
import { FCMService } from "./FCMService";
import { EmailService } from "./EmailService";
import { UserStatusStore } from "../utils";
import { TwillioService } from "./TwillioService";

class RabbitMQService {
  private channel!: Channel;
  private fcmService = new FCMService();
  private emailService = new EmailService();
  private userStatusStore = new UserStatusStore();
  private twillioService = new TwillioService();
  private emailQueue = "EMAIL_NOTIFICATION_QUEUE";
  private smsQueue = "SMS_NOTIFICATION_QUEUE";
  constructor() {
    this.init();
  }

  async init() {
    const connection = await amqp.connect(config.msgBrokerURL!);
    this.channel = await connection.createChannel();
    await this.channel.assertQueue(config.queue.notifications);
    await this.channel.assertQueue(this.emailQueue);
    await this.channel.assertQueue(this.smsQueue);
    await this.consumeNotification();
    await this.consumeEmailNotifications();
    await this.consumeSMSNotifications();
  }

  async consumeNotification() {
    await this.channel.assertQueue(config.queue.notifications);
    this.channel.consume(config.queue.notifications, async (msg) => {
      if (msg) {
        const { type, userId, message, userEmail, userToken, fromName } =
          JSON.parse(msg.content.toString());

        if (type === "MESSAGE_RECEIVED") {
          // Check if the user is online
          const isUserOnline = this.userStatusStore.isUserOnline(userId);

          if (isUserOnline && userToken) {
            // User is online, send a push notification
            await this.fcmService.sendPushNotification(userToken, message);
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
    this.channel.consume(this.emailQueue, async (msg) => {
      if (msg) {
        const { to, subject, body } = JSON.parse(msg.content.toString());
        await this.emailService.sendEmail(to, subject, body);
        console.log(`Email sent to ${to}`);
        this.channel.ack(msg);
      }
    });
  }
  async consumeSMSNotifications() {
    this.channel.consume(this.smsQueue, async (msg) => {
      if (msg) {
        const { to } = JSON.parse(msg.content.toString());
        await this.twillioService.sendSMS(to);
        console.log(`SMS sent to ${to}`);
        this.channel.ack(msg);
      }
    });
  }
}

export const rabbitMQService = new RabbitMQService();
