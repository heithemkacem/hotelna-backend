import mongoose, { Schema, Document } from 'mongoose';

// Interface for coordinates
interface ICoordinates {
  lat: number;
  long: number;
}

// Interface for services
interface IService {
  name: string;
  description?: string;
}

// Interface for TypeScript typing
export interface IHotel extends Document {
  profile: mongoose.Types.ObjectId;
  name: string;
  location?: string;
  coordinates: ICoordinates;
  sponsored: boolean;
  services: IService[];
  createdAt: Date;
}

// Schema Definition
const hotelSchema = new Schema<IHotel>({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  name: { type: String, required: true },
  location: { type: String },
  coordinates: {
    lat: { type: Number },
    long: { type: Number }
  },
  sponsored: { type: Boolean, default: false },
  services: [{
    name: { type: String, required: true },
    description: { type: String }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Exporting the Model
const Hotel = mongoose.model<IHotel>('Hotel', hotelSchema);
export default Hotel;
