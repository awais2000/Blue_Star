import mongoose, { Document, Schema, Model } from "mongoose";

export interface ITempProducts extends Document {
    productId: mongoose.Types.ObjectId;
    QTY: number;
    unitPrice: number;
    discount: number;
    VATstatus: string;
};



const TempProductsSchema: Schema<ITempProducts> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Products", required: true },
    QTY: { type: Number, required: true },
    unitPrice: {type: Number, required: true, },
    discount: { type: Number, trim: true },
    VATstatus: {type: String, trim: true},
  },
  { versionKey: false }
);



const TempProducts: Model<ITempProducts> = mongoose.model<ITempProducts>("TempProducts", TempProductsSchema);
export default TempProducts;