import mongoose, { Document, Schema, Model } from "mongoose";

export interface IInvoiceProduct {
  productId: mongoose.Types.ObjectId;
  productName: string;
  qty: number;
  rate: number;
  discount: number;
  VAT: number;
  total: number;
  netTotal: number;
}

export interface ISalesDetail extends Document {
  customerName: string;
  customerContact: string;
  products: IInvoiceProduct[];
  grandTotal: number;
  invoiceNo: number;
  invoice: string;
  date: Date;
  status: "Y" | "N";
  createdAt: Date;
}

const SalesDetailSchema: Schema<ISalesDetail> = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerContact: { type: String, required: true, trim: true },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },
        productName: { type: String, required: true },
        qty: { type: Number, required: true },
        rate: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        VAT: { type: Number, required: true },
        total: { type: Number, required: true },
        netTotal: { type: Number, required: true },
      },
    ],
    grandTotal: { type: Number, required: true },
    invoiceNo: { type: Number, required: true, unique: true },
    invoice: {type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
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
