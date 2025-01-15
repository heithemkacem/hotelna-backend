import mongoose, { Schema, Document } from 'mongoose';


export interface IService extends Document {
  _id: mongoose.Types.ObjectId; 
  name: string;
  description: string;
  key: number;
}


const serviceSchema = new Schema<IService>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  key: { type: Number, default: 0, required: true, unique: true }, 
});


serviceSchema.pre<IService>('save', async function (next) {
  if (this.isNew) {
    const lastService = await Service.findOne().sort({ key: -1 });
    this.key = lastService ? lastService.key + 1 : 1; 
  }
  next(); 
});


const Service = mongoose.model<IService>('Service', serviceSchema);
export default Service;
