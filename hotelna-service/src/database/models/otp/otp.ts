import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otp: string;
  type: "created-account" | "reset-password" | "in-app-change-phone-number";
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  type: {
    type: String,
    enum: ["created-account", "reset-password", "in-app-change-phone-number"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const OTP = mongoose.model<IOTP>("OTP", otpSchema);
export default OTP;
