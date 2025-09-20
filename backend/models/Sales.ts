import mongoose, { Document, Schema, Model } from "mongoose";


export interface ISales extends Document {
    customerId:  number;
    productId: number;
    invoiceNo: number;
    status: "Y" | "N";
    createdAt: Date;
};



const SalesSchema: Schema<ISales> = new Schema(
  {
    customerId: { type: Number, required: true, ref: "Customers", trim: true },
    productId: { type: Number, required: true, ref: "Products"},
    invoiceNo: { type: Number, required: true, ref: "Invoice"},
    status: {
      type: String,
      enum: ["Y", "N"], 
      default: "Y",
    },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);



const Sales: Model<ISales> = mongoose.model<ISales>("Products", SalesSchema);
export default Sales;