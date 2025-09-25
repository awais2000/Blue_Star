import express from "express";
// const logoBase64 = fs.readFileSync("./uploads/bluestarlogo.jpg", "base64");
import { handleError } from "../utils/errorHandler";
import PrinterConfigurationModel from "../models/printerConfiguration";
import SalesDetail from "../models/SalesDetail"
import Product, { IProducts } from "../models/Products";
import TempProducts from "../models/tempProducts";


export const addPrintConfig = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = req.params.id; 
    const { printType } = req.body;

    if (!printType) {
      res.status(400).json({ message: "Bad Request: printType is required" });
      return;
    }

    let config;

    if (!id) {
      config = await PrinterConfigurationModel.create({ printType });
    } else {
      config = await PrinterConfigurationModel.findByIdAndUpdate(
        id,
        { $set: { printType } },
        { new: true, upsert: true } 
      );
    }

    res.status(200).json({
      success: true,
      message: !id ? "Print configuration created successfully" : "Print configuration updated successfully",
      ...config.toObject(),
    });
  } catch (error) {
    handleError(res, error);
  }
};