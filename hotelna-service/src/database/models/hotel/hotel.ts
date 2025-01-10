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
  blocked: boolean; // New field
  rating: number; // New field
  price: number; // New field
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
  blocked: { type: Boolean, default: false }, // Default to unblocked
  rating: { type: Number, min: 0, max: 5, default: 0 }, // Rating between 0 and 5
  price: { type: Number, default: 0 }, // Default price
  createdAt: { type: Date, default: Date.now }
});

// Exporting the Model
const Hotel = mongoose.model<IHotel>('Hotel', hotelSchema);
export default Hotel;
