import mongoose, { Document, Schema, Model } from "mongoose";



export interface ILoans extends Document {
    productName:  string;
    customerId: mongoose.Types.ObjectId;
    rate: string;
    price: number;
    quantity: number;
    receivable: number;
    date: Date;
    total: number
    totalBalance: number; 
    remainingCash: number;
    status: string; 
    createdAt: Date;
};


const LoansScehma = new mongoose.Schema({
  productName: String,
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customers",
    required: true,
  },
  price: Number,
  rate: Number,
  quantity: Number,
  receivable: Number,
  date: Date,
  total: Number,
  totalBalance: Number,
  remainingCash: Number,
  status: { type: String, default: "Y" },
}, { timestamps: true });


const Loans: Model<ILoans> = mongoose.model<ILoans>("Loans", LoansScehma);
export default Loans;