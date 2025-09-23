import mongoose, { Document, Schema, Model } from "mongoose";


export interface ISales extends Document {
    productId: mongoose.Types.ObjectId;
    invoiceNo: number;
    status: "Y" | "N";
    createdAt: Date;
};



const SalesSchema: Schema<ISales> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    invoiceNo: { type: Number, required: true, ref: "Invoice" },
    status: {
      type: String,
      enum: ["Y", "N"],
      default: "Y",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);




const Sales: Model<ISales> = mongoose.model<ISales>("Sales", SalesSchema);
export default Sales;