import mongoose, { Document, Schema, Model } from "mongoose";
import { IProducts } from "../models/Products";


export interface IInvoiceItem {
  productId: mongoose.Types.ObjectId; 
  qty: number;
  unitPrice: number;
}

export interface ISalesDetail extends Document {
    productId: mongoose.Types.ObjectId | IProducts; 
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
    items: IInvoiceItem[];
};



const SalesDetailSchema: Schema<ISalesDetail> = new Schema(
  {
    items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products" },
      qty: Number,
      unitPrice: Number
    }
  ],
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