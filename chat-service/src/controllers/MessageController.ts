import { Response } from "express";
import { AuthRequest } from "../middleware";
import { Message } from "../database";
import { ApiError } from "../utils";

const send = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, message } = req.body;
    const { _id, email, name } = req.user;

    validateReceiver(_id, receiverId);

    const newMessage = await Message.create({
      senderId: _id,
      receiverId,
      message,
    });

    // await handleMessageReceived(name, email, receiverId, message);

    return res.json({
      status: 200,
      message: "Message sent successfully!",
      data: newMessage,
    });
  } catch (error: any) {
    return res.json({
      status: 500,
      message: error.message,
    });
  }
};

const validateReceiver = (senderId: string, receiverId: string) => {
  if (!receiverId) {
    throw new ApiError(404, "Receiver ID is required.");
  }

  if (senderId == receiverId) {
    throw new ApiError(400, "Sender and receiver cannot be the same.");
  }
};

const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user._id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // Calculate the starting index for the query
    const startIndex = (page - 1) * limit;

    // Fetch the messages with pagination
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Get the total count of messages for this conversation
    const total = await Message.countDocuments({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return res.json({
      status: 200,
      message: "Messages retrieved successfully!",
      messages,
      total,
      totalPages,
      currentPage: page,
      pageSize: limit,
    });
  } catch (error: any) {
    return res.json({
      status: 500,
      message: error.message,
    });
  }
};

export default {
  send,
  getConversation,
};
