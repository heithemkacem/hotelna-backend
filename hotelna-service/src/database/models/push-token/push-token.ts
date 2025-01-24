import mongoose, { Schema, Document } from "mongoose";

export interface IExpoPushToken extends Document {
  expoPushToken: string; // The Expo push token
  type: "hotel" | "client" | "admin"; // User role
  active: boolean; // Indicates if the token is active
  device_id: string; // Unique device identifier
  device_type: "Ios" | "Android"; // Device type
  user_id: mongoose.Schema.Types.ObjectId;
}

const expoPushTokenSchema = new Schema<IExpoPushToken>(
  {
    expoPushToken: { type: String, required: true }, // Expo push token
    type: { type: String, enum: ["hotel", "client", "admin"], required: true },
    active: { type: Boolean, default: true }, // Token is active by default
    device_id: { type: String, required: true }, // Unique device identifier
    device_type: { type: String, enum: ["Ios", "Android"], required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt
);

const ExpoPushToken = mongoose.model<IExpoPushToken>(
  "ExpoPushToken",
  expoPushTokenSchema
);
export default ExpoPushToken;
