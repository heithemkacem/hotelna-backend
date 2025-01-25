import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript typing
export interface IHotel extends Document {
  profile: mongoose.Types.ObjectId;
  name: string;
  location?: string;
  coordinates: { lat: number; long: number };
  description: string;
  sponsored: boolean;
  services: any;
  blocked: boolean;
  rating: number;
  price: number;
  images: string[];
  key: number;
  qrCode: any;
  createdAt: Date;
  current_clients: mongoose.Types.ObjectId[]; // Ensure the type is ObjectId
}

// Schema Definition
const hotelSchema = new Schema<IHotel>({
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String },
  coordinates: {
    lat: { type: Number },
    long: { type: Number },
  },
  sponsored: { type: Boolean, default: false },
  services: [
    {
      service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
      status: {
        type: String,
        enum: ["dispo", "indispo", "en maintenance"],
        default: "dispo",
      },
    },
  ],
  blocked: { type: Boolean, default: false },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  price: { type: Number, default: 0 },
  images: [{ type: String }], // Added images field
  key: { type: Number, unique: true, required: true }, // Added key field
  qrCode: { type: String, required: true },
  current_clients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }],
  createdAt: { type: Date, default: Date.now },
});

const Hotel = mongoose.model<IHotel>("Hotel", hotelSchema);
export default Hotel;
