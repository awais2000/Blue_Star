import mongoose, { Document, Schema, Model } from "mongoose";



export interface ILoans extends Document {
    productId:  string;
    customerId: string;
    price: number;
    date: Date;
    total: number
    status: string;
    createdAt: Date;
};



const LoansScehma: Schema<ILoans> = new Schema(
  {
    productId: { type: String, required: true, trim: true },
    customerId: { type: String, required: true, trim: true },
    price: {type: Number, required: true, trim: true},
    date: { type: Date, default: Date.now },
    total: {type: Number, required: true, trim: true},
    status: {
      type: String,
      enum: ["Y", "N"],
      default: "Y",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);



const Loans: Model<ILoans> = mongoose.model<ILoans>("Loans", LoansScehma);
export default Loans;