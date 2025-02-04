import mongoose, { Schema, Document } from "mongoose";

export interface IService extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  key: string;
}

const serviceSchema = new Schema<IService>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  key: { type: String, required: true, unique: true },
});

const Service = mongoose.model<IService>("Service", serviceSchema);
export default Service;
