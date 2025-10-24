import mongoose, { Document, Schema, Model } from "mongoose";



export interface ILoans extends Document {
    productId:  mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    price: number;
    date: Date;
    total: number
    status: string;
    createdAt: Date;
};



const LoansScehma = new mongoose.Schema({
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
  price: Number,
  date: Date,
  total: Number,
  status: { type: String, default: "Y" },
}, { timestamps: true });


const Loans: Model<ILoans> = mongoose.model<ILoans>("Loans", LoansScehma);
export default Loans;