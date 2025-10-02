import mongoose, { Document, Schema, Model } from "mongoose";


export interface IfakeInvoice extends Document {
    invoiceNo:  number;
    createdAt: Date;
};



const fakeInvoiceSchema: Schema<IfakeInvoice> = new Schema(
  {
    invoiceNo: { type: Number, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);



const fakeInvoice: Model<IfakeInvoice> = mongoose.model<IfakeInvoice>("fakeInvoice", fakeInvoiceSchema);
export default fakeInvoice;