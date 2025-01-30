import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript typing
export interface IImage extends Document {
  url: string;
  hotel?: mongoose.Types.ObjectId;
  name: string;
  size: number;
  key: string;
  mimetype: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema Definition
const imageSchema = new Schema<IImage>(
  {
    url: {
      type: String,
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
    },
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // This automatically adds createdAt and updatedAt fields
);

const ImageModel = mongoose.model<IImage>("Image", imageSchema);
export default ImageModel;
