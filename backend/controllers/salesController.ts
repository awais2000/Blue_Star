import express from "express";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales"
import SalesDetail from "../models/SalesDetail"
import { handleError } from "../utils/errorHandler";
import mongoose from "mongoose";



export const createSaleData = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const {
      productId,
      customerName,
      customerContact,
      unitPrice,
      discount,
      date,
      QTY,
      total,
      VAT,
      netTotal,
    } = req.body;

    const requiredFields = [
      "productId",
      "unitPrice",
      "date",
      "QTY",
      "total",
      "VAT",
      "netTotal",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
      return;
    }

    let invoice = await Invoice.findOne();

    let currentInvoiceNo: number;
    if (invoice) {
      currentInvoiceNo = invoice.invoiceNo;
      invoice.invoiceNo = currentInvoiceNo + 1;
      await invoice.save();
    } else {
      currentInvoiceNo = 1;
      invoice = await Invoice.create({ invoiceNo: currentInvoiceNo });
    }

    const newSale = await SalesDetail.create({
        productId: new mongoose.Types.ObjectId(productId), // important
        customerName,
        customerContact,
        unitPrice,
        discount,
        date,
        QTY,
        invoiceNo: currentInvoiceNo,
        total,
        VAT,
        netTotal,
        invoice: `BS-${currentInvoiceNo}`,
    });


    await Sales.create({
      productId,
      invoiceNo: currentInvoiceNo,
    });

    const populatedSale = await SalesDetail.findById(newSale._id)
    .populate("productId")
    .lean();
    
    res.status(200).send({
      message: "Purchase Successful!",
      ...populatedSale.toObject(),
    });

  } catch (error) {
    handleError(res, error);
  }
};
