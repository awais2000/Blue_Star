// import mongoose, { Document, Schema, Model } from "mongoose";
 
// export interface ITempProducts extends Document {
//     productId: mongoose.Types.ObjectId;
//     QTY: number;
//     unitPrice: number;
//     discount: number;
//     VATstatus: string;
//     createdAt: Date;
 
// };
 
// const TempProductsSchema: Schema<ITempProducts> = new Schema(
//   {
//     productId: { type: Schema.Types.ObjectId, ref: "Products", required: true },
//     QTY: { type: Number, required: true },
//     unitPrice: {type: Number, required: true, },
//     discount: { type: Number, trim: true },
//     VATstatus: {type: String, trim: true},
//   },
//   { versionKey: false, timestamps: true, },
// );
 
// const TempProducts: Model<ITempProducts> = mongoose.model<ITempProducts>("TempProducts", TempProductsSchema);
// export default TempProducts;
 
import mongoose, { Document, Schema, Model } from "mongoose";
 
export interface ITempProducts extends Document {
  productId?: mongoose.Types.ObjectId;
  customProductName?: string;
  productWarranty: String;
 
  QTY: number;
  unitPrice: number;
  discount: number;
  VATstatus: string;
  createdAt: Date;
}
 
const TempProductsSchema: Schema<ITempProducts> = new Schema(
  {
    // Existing Product
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Products",
      required: false,
    },
 
    // Manual Product Name
    customProductName: {
      type: String,
      trim: true,
      required: false,
    },
    productWarranty: {
      type: String,
    },
 
    QTY: {
      type: Number,
      required: true,
    },
 
    unitPrice: {
      type: Number,
      required: true,
    },
 
    discount: {
      type: Number,
      default: 0,
    },
 
    VATstatus: {
      type: String,
      trim: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
 
const TempProducts: Model<ITempProducts> = mongoose.model<ITempProducts>(
  "TempProducts",
  TempProductsSchema,
);
 
export default TempProducts;