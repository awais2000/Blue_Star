import mongoose, { Document, Schema, Model } from "mongoose";

export interface IProducts extends Document {
  productName: string;
  quantity: number;
  price: number;
  image: string;
  status: "Y" | "N";
  createdAt: Date;
}



const ProductSchema: Schema<IProducts> = new Schema(
  {
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true},
    price: { type: Number, required: true },
    image: { type: String, required: true },
    status: {
      type: String,
      enum: ["Y", "N"], 
      default: "Y",
    },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const Products: Model<IProducts> = mongoose.model<IProducts>("Products", ProductSchema);
export default Products;