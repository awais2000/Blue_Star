import mongoose, { Document, Schema, Model } from "mongoose";



export interface IReceivable extends Document {
    productId:  mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    date: Date;
    totalBalance: number;
    paid: number;
    total: number;
    status: string;
    createdAt: Date;
};



const ReceivableScehma = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customers",
    required: true,
  },
  date: Date,
  totalBalance: Number,
  paid: Number,
  total: Number,
  status: { type: String, default: "Y" },
}, { timestamps: true });


const Receivable: Model<IReceivable> = mongoose.model<IReceivable>("Receivable", ReceivableScehma);
export default Receivable;