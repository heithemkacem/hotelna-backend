import mongoose from "mongoose";
import config from "../config/config";
import { createAdminUser } from "../controllers/admin-controller";

export const connectDB = async () => {
  try {
    console.info("Connecting to database..." + config.MONGO_URI);
    await mongoose.connect(config.MONGO_URI!);
    createAdminUser();
    console.info("Database connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
