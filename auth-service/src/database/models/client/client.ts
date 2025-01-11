import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript typing
export interface IClient extends Document {
  profile: mongoose.Types.ObjectId;
  current_hotel?: mongoose.Types.ObjectId;
  visited_hotels: mongoose.Types.ObjectId[];
  notifications: boolean;
  name : string;
  sounds: boolean;
  createdAt: Date;
}

// Schema Definition
const clientSchema = new Schema<IClient>({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  current_hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  name : {
    type:String
  },
  visited_hotels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }],
  notifications: { type: Boolean, default: true },
  sounds: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Exporting the Model
const Client = mongoose.model<IClient>('Client', clientSchema);
export default Client;
  