import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceRequest extends Document {
  client: any;
  hotel: any;
  service: any;
  roomNumber: string;
  message: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
}

const serviceRequestSchema = new Schema<IServiceRequest>({
  client: { type: mongoose.Types.ObjectId, ref: 'Client', required: true },
  hotel: { type: mongoose.Types.ObjectId, ref: 'Hotel', required: true },
  service: { type: mongoose.Types.ObjectId, ref: 'Service', required: true },
  roomNumber: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
});

const ServiceRequest = mongoose.model<IServiceRequest>('ServiceRequest', serviceRequestSchema);
export default ServiceRequest;
