import mongoose, { Schema, Document } from "mongoose";
type LoginHistory = {
  action: string;
  date: Date | string;
};
const loginHistorySchema = new Schema({
  action: { type: String, required: true },
  date: { type: Date, required: true },
});
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
  source: string;
}
const profileSchema = new Schema<IProfile>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String },
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
  loginHistory: { type: [loginHistorySchema], default: [] }, // Updated loginHistory
  expoPushToken: { type: String, required: false },
  blocked: { type: Boolean, default: false },
  source: { type: String, required: true },
});

// Exporting the Model
const Profile = mongoose.model<IProfile>("Profile", profileSchema);
export default Profile;
