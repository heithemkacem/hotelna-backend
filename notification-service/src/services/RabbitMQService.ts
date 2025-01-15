import amqp, { Channel } from "amqplib";
import config from "../config/config";
import { ExpoPushService } from "./ExpoPushService";
import { EmailService } from "./EmailService";
import { UserStatusStore } from "../utils";
import { TwillioService } from "./TwillioService";

class RabbitMQService {
  private channel!: Channel;
  private expoPushService = new ExpoPushService();
  private emailService = new EmailService();
  private userStatusStore = new UserStatusStore();
  private twillioService = new TwillioService();
  private emailQueue = "EMAIL_NOTIFICATION_QUEUE";
  private smsQueue = "SMS_NOTIFICATION_QUEUE";
  private phoneOTPQueue = "PHONE_OTP_NOTIFICATION_QUEUE";
  private verificationFailedQueue = "VERIFICATION_FAILED_QUEUE";
  private sendNotificationQueue = "SEND_NOTIFICATION_QUEUE";
  constructor() {
    this.init();
  }

  async init() {
    const connection = await amqp.connect(config.msgBrokerURL!);
    this.channel = await connection.createChannel();
    await this.channel.assertQueue(config.queue.notifications);
    await this.channel.assertQueue(this.emailQueue);
    await this.channel.assertQueue(this.smsQueue);
    await this.channel.assertQueue(this.phoneOTPQueue);
    await this.channel.assertQueue(this.verificationFailedQueue);
    await this.channel.assertQueue(this.sendNotificationQueue);
    await this.consumeNotification();
    await this.consumeEmailNotifications();
    await this.consumeSMSNotifications();
    await this.consumePhoneOTPNotifications();
    await this.consumeSendNotification();
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
  async consumePhoneOTPNotifications() {
    this.channel.consume(this.phoneOTPQueue, async (msg) => {
      if (msg) {
        const { to, code } = JSON.parse(msg.content.toString());
        await this.twillioService.verifySMS(to, code);
        console.log(`SMS sent to ${to}`);
        this.channel.ack(msg);
      }
    });
  }
  async sendVerificationFailedNotifications(verification: boolean) {
    const message = { verification };
    this.channel.sendToQueue(
      this.verificationFailedQueue,
      Buffer.from(JSON.stringify(message))
    );
  }
  async consumeSendNotification() {
    this.channel.consume(this.sendNotificationQueue, async (msg) => {
      if (msg) {
        const { to, title, body, data } = JSON.parse(msg.content.toString());
        await this.expoPushService.sendPushNotification(to, title, body, data);
        this.channel.ack(msg);
      }
    });
  }
}

export const rabbitMQService = new RabbitMQService();
