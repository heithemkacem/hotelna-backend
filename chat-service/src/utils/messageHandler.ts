import { rabbitMQService } from "../services/RabbitMQService";

export const handleMessageReceived = async (
  senderName: string,
  receiverId: string,
  messageContent: string
) => {
  await rabbitMQService.notifyReceiver(receiverId, messageContent, senderName);
};
