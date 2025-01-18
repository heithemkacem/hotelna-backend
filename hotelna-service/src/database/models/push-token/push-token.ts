import mongoose, { Schema, Document } from 'mongoose';

export interface IExpoPushToken extends Document {
  _id: string; // The Expo push token
  type: 'hotel' | 'client' | 'admin'; // User role
  active: boolean; // Indicates if the token is active
  device_id: string; // Unique device identifier
  device_type: 'ios' | 'android'; // Device type
}

const expoPushTokenSchema = new Schema<IExpoPushToken>(
  {
    _id: { type: String, required: true }, // Expo push token
    type: { type: String, enum: ['hotel', 'client', 'admin'], required: true },
    active: { type: Boolean, default: true }, // Token is active by default
    device_id: { type: String, required: true }, // Unique device identifier
    device_type: { type: String, enum: ['ios', 'android'], required: true },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt
);

const ExpoPushToken = mongoose.model<IExpoPushToken>('ExpoPushToken', expoPushTokenSchema);
export default ExpoPushToken;
