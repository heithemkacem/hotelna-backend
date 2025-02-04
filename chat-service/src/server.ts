import { Server } from "http";
import { Socket, Server as SocketIOServer } from "socket.io";
import app from "./app";
import { Message, connectDB } from "./database";
import config from "./config/config";
import morgan from "morgan";
import { handleMessageReceived } from "./utils";
let server: Server;
connectDB();
app.use(morgan("dev"));
server = app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});
const userSocketMap = new Map();
const io = new SocketIOServer(server);
io.on("connection", (socket: Socket) => {
  console.log("Client connected", socket.id);

  socket.on("register", (userId) => {
    // Check if user is already registered and update the socket ID
    if (userSocketMap.has(userId)) {
      console.log(`Updating socket ID for user ${userId}`);
    }
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ID ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
    for (const [userId, sockId] of userSocketMap.entries()) {
      if (sockId === socket.id) {
        userSocketMap.delete(userId);
        console.log(`Removed user ${userId} from map`);
        break;
      }
    }
  });
  socket.on("sendMessage", async (data) => {
    const { senderId, receiverId, message } = data;
    const msg = new Message({ senderId, receiverId, message });
    await msg.save();
    console.log(data);
    const receiverSocketId = userSocketMap.get(receiverId);
    console.log("receiverSocketId", receiverSocketId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", msg);
    } else {
      console.log(`User ${receiverId} is not connected`);
      handleMessageReceived("Test", receiverId, message);
      // Optionally, you could store the message for later delivery
    }
  });
});
const unexpectedErrorHandler = (error: unknown) => {
  console.error(error);
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
