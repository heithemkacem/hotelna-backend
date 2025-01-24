import amqp, { Channel } from "amqplib";
import { v4 as uuidv4 } from "uuid";
import config from "../config/config";

class RabbitMQService {
  private correlationMap = new Map();
  private channel!: Channel;

  constructor() {
    this.init();
  }

  async init() {
    const connection = await amqp.connect(config.msgBrokerURL!);
    this.channel = await connection.createChannel();
    await this.channel.assertQueue(config.queue.requestQueue);
    await this.channel.assertQueue(config.queue.responseQueue);

    this.channel.consume(
      config.queue.responseQueue,
      (msg) => {
        if (msg) {
          const correlationId = msg.properties.correlationId;
          const user = JSON.parse(msg.content.toString());

          const callback = this.correlationMap.get(correlationId);
          if (callback) {
            callback(user);
            this.correlationMap.delete(correlationId);
          }
        }
      },
      { noAck: true }
    );
  }

  async requestUserDetails(userId: string, callback: Function) {
    const correlationId = uuidv4();
    this.correlationMap.set(correlationId, callback);
    this.channel.sendToQueue(
      config.queue.requestQueue,
      Buffer.from(JSON.stringify({ userId })),
      { correlationId }
    );
  }

  async notifyReceiver(
    receiverId: string,
    messageContent: string,
    senderName: string
  ) {
    await this.requestUserDetails(receiverId, async (user: any) => {
      console.log(user);
      const notificationPayload = {
        type: "MESSAGE_RECEIVED",
        userId: receiverId,
        userEmail: user.email,
        userToken: user.expoPushToken ? user.expoPushToken : "not_available",
        message: messageContent,
        fromName: senderName,
      };

      try {
        await this.channel.assertQueue(config.queue.notifications);
        this.channel.sendToQueue(
          config.queue.notifications,
          Buffer.from(JSON.stringify(notificationPayload))
        );
      } catch (error) {
        console.error(error);
      }
    });
  }
}

export const rabbitMQService = new RabbitMQService();
