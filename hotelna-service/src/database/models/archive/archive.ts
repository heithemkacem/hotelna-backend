import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript typing
export interface IArchivedHotel extends Document {
  profile: mongoose.Types.ObjectId;
  name: string;
  description: string;
  location: string;
  coordinates: { lat: number; long: number };
  stars: number;
  sponsored: boolean;
  services: any;
  blocked: boolean;
  rating: number;
  price: number;
  images: string[];
  key: number;
  archivedAt: Date;
}

const archivedHotelSchema = new Schema<IArchivedHotel>({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    long: { type: Number, required: true },
  },
  stars: { type: Number, required: true },
  sponsored: { type: Boolean, default: false },
  services: [
    {
      service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
      status: { type: String, enum: ['dispo', 'indispo', 'en maintenance'], default: 'dispo' },
    },
  ],
  blocked: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  images: [{ type: String }],
  key: { type: Number, required: true },
  archivedAt: { type: Date, default: Date.now },
});

const ArchivedHotel = mongoose.model<IArchivedHotel>('ArchivedHotel', archivedHotelSchema);
export default ArchivedHotel;
