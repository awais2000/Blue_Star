import mongoose, { Document, Schema, Model } from "mongoose";


export interface ISalesDetail extends Document {
    rate:  number;
    discount: number;
    invoiceNo:  number;
    total: number;
    VAT: number;
    netTotal: number;
    invoice: string;
    status: "Y" | "N";
    createdAt: Date;
};



const SalesDetailSchema: Schema<ISalesDetail> = new Schema(
  {
    rate: { type: Number, required: true},
    discount: { type: Number, required: true},
    invoiceNo: { type: Number, required: true, ref: "Invoice"},
    total: {type: Number, required: true},
    VAT: {type: Number, requried: true},
    netTotal: {type: Number, required: true},
    invoice: {type: String, requried: true},
    status: {
      type: String,
      enum: ["Y", "N"], 
      default: "Y",
    },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);




const SalesDetail: Model<ISalesDetail> = mongoose.model<ISalesDetail>("SalesDetail", SalesDetailSchema);
export default SalesDetail;