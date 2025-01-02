import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript typing
export interface IAdmin extends Document {
  profile: mongoose.Types.ObjectId;
  permissions: string[];
  createdAt: Date;
}

// Schema Definition
const adminSchema = new Schema<IAdmin>({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  permissions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Exporting the Model
const Admin = mongoose.model<IAdmin>('Admin', adminSchema);
export default Admin;
