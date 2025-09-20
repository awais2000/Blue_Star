import mongoose, { Document, Schema, Model } from "mongoose";


export interface IInvoice extends Document {
    invoiceNo:  number;
    createdAt: Date;
};



const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    invoiceNo: { type: Number, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);



const Invoice: Model<IInvoice> = mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;