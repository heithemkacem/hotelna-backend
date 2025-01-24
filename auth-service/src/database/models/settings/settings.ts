import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  user: mongoose.Types.ObjectId;
  notification: boolean;
  emailNotification: boolean;
  bookingUpdate: boolean;
  userType:any;
  newMessage: boolean;
  marketing: boolean;
}

const settingsSchema = new Schema<ISettings>({
  user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType', required: true },
  userType: { type: String, enum: ['Admin', 'Client', 'Hotel'], required: true },
  notification: { type: Boolean, default: true },
  emailNotification: { type: Boolean, default: true },
  bookingUpdate: { type: Boolean, default: true },
  newMessage: { type: Boolean, default: true },
  marketing: { type: Boolean, default: true },
});

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
export default Settings;
