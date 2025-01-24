import mongoose, { Schema, Document } from "mongoose";
type LoginHistory = {
  action: string;
  date: Date | string;
};
// Interface for TypeScript typing
export interface IProfile extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  type: "client" | "hotel" | "admin";
  isVerified: boolean;
  createdAt: Date;
  user_id: mongoose.Schema.Types.ObjectId;
  isPhoneVerified: boolean;
  loginHistory: LoginHistory[];
  expoPushToken: string;
  blocked: boolean;
}

// Schema Definition
const profileSchema = new Schema<IProfile>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Added password field
  phone: { type: String },
  isPhoneVerified: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ["client", "hotel", "admin"],
    required: true,
  },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  user_id: { type: mongoose.Schema.Types.ObjectId },
  loginHistory: { type: [String], default: [] },
  expoPushToken: { type: String, required: false }, // Expo push token
  blocked: { type: Boolean, default: false },
});

// Exporting the Model
const Profile = mongoose.model<IProfile>("Profile", profileSchema);
export default Profile;
