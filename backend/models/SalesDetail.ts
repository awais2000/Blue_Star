import mongoose, { Document, Schema, Model } from "mongoose";


export interface ISalesDetail extends Document {
    productId: mongoose.Types.ObjectId,
    customerName:  string;
    customerContact: string;
    unitPrice:  number;
    discount: number;
    date: Date,
    QTY: number,
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
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    customerName: { type: String, trim: true },
    customerContact: { type: String },
    unitPrice: { type: Number, required: true },
    discount: { type: Number },
    date: { type: Date, required: true },
    QTY: { type: Number, required: true },
    invoiceNo: { type: Number, required: true, ref: "Invoice" },
    total: { type: Number, required: true },
    VAT: { type: Number, required: true },
    netTotal: { type: Number, required: true },
    invoice: { type: String, required: true },
    status: {
      type: String,
      enum: ["Y", "N"],
      default: "Y",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);





const SalesDetail: Model<ISalesDetail> = mongoose.model<ISalesDetail>("SalesDetail", SalesDetailSchema);
export default SalesDetail;