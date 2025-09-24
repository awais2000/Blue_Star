import mongoose, { Document, Schema, Model } from "mongoose";


export interface IPrinterConfiguration extends Document {
    printType:  string;
    createdAt: Date;
    updatedAt: Date;
};



const PrinterConfigurationSchema: Schema<IPrinterConfiguration> = new Schema(
  {
    printType: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: {type: Date, default: Date.now}
  },
  { versionKey: false }
);



const PrinterConfigurationModel: Model<IPrinterConfiguration> = mongoose.model<IPrinterConfiguration>("PrinterConfigurationModel", PrinterConfigurationSchema);
export default PrinterConfigurationModel;