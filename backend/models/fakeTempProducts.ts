import mongoose, { Document, Schema, Model } from "mongoose";

export interface IfakeTempProducts extends Document {
    productId: mongoose.Types.ObjectId;
    QTY: number;
    unitPrice: number;
    discount: number;
    VATstatus: string;
    createdAt: Date;  

};



const fakeTempProductsSchema: Schema<IfakeTempProducts> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Products", required: true },
    QTY: { type: Number, required: true },
    unitPrice: {type: Number, required: true, },
    discount: { type: Number, trim: true },
    VATstatus: {type: String, trim: true},
  },
  { versionKey: false, timestamps: true, },
);



const fakeTempProducts: Model<IfakeTempProducts> = mongoose.model<IfakeTempProducts>("TempProducts", fakeTempProductsSchema);
export default fakeTempProductsSchema;