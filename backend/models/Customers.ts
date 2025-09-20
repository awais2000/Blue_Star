import mongoose, { Document, Schema, Model } from "mongoose";


export interface ICustomers extends Document {
    customerName:  string;
    customerContact: string;
    customerAddress: string;
    status: "Y" | "N";
    createdAt: Date;
};



const CustomerSchema: Schema<ICustomers> = new Schema ({
    customerName: { type: String, required: true, trim: true },
    customerContact: { type: String, required: true},
    customerAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ["Y", "N"], 
      default: "Y",
    },
    createdAt: { type: Date, default: Date.now }
},
  { versionKey: false }
);



const Customers: Model<ICustomers> = mongoose.model<ICustomers>("Customers", CustomerSchema);
export default Customers;