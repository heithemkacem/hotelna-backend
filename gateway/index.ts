import express from "express";
import proxy from "express-http-proxy";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const auth = proxy("http://localhost:8081");
const messages = proxy("http://localhost:8082");
const notifications = proxy("http://localhost:8083");
const hotelna = proxy("http://localhost:8084");
app.use("/api/auth", auth);
app.use("/api/chat", messages);
app.use("/api/notifications", notifications);
app.use("/api/hotelna", hotelna);

const server = app.listen(9090, () => {
  console.log("Gateway is Listening to Port 9090");
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      console.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: unknown) => {
  console.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
