import mongoose, { Document, Schema, Model } from "mongoose";



export interface IReceivable extends Document {
    customerId: mongoose.Types.ObjectId;
    date: Date;
    totalBalance: number;
    paidCash: number;
    remainingCash: number;
    status: string;
    createdAt: Date;
};



const ReceivableScehma = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customers",
    required: true,
  },
  date: Date,
  totalBalance: Number,
  paidCash: Number,
  remainingCash: Number,
  status: { type: String, default: "Y" },
}, { timestamps: true });


const Receivable: Model<IReceivable> = mongoose.model<IReceivable>("Receivable", ReceivableScehma);
export default Receivable;