import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript typing
export interface IProfile extends Document {
  email: string;
  password: string;
  phone?: string;
  type: "client" | "hotel" | "admin";
  user?: mongoose.Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
  user_id: mongoose.Schema.Types.ObjectId;
  isPhoneVerified: boolean;
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
});

// Exporting the Model
const Profile = mongoose.model<IProfile>("Profile", profileSchema);
export default Profile;
