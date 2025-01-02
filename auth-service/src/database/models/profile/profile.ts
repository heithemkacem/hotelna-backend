import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript typing
export interface IProfile extends Document {
  email: string;
  password: string;
  phone?: string;
  type: 'client' | 'hotel' | 'admin';
  user?: mongoose.Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
}

// Schema Definition
const profileSchema = new Schema<IProfile>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },  // Added password field
  phone: { type: String },
  type: {
    type: String,
    enum: ['client', 'hotel', 'admin'],
    required: true
  },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Exporting the Model
const Profile = mongoose.model<IProfile>('Profile', profileSchema);
export default Profile;
