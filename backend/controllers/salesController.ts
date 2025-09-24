import express from "express";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales"
import SalesDetail from "../models/SalesDetail"
import { handleError } from "../utils/errorHandler";
import mongoose from "mongoose";
import TempProducts from "../models/tempProducts";



export const addProductToCart = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { productId, QTY, unitPrice, discount, VATstatus} = req.body;

    const requiredFields = ["productId", "QTY", "unitPrice", "VATstatus"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
      return;
    }

    const cart = await TempProducts.create({
      productId,
      QTY,
      unitPrice,
      discount,
      VATstatus
    });

    const result = await TempProducts.findById(cart._id)
      .populate("productId")
      .lean();

    if (!result) {
      res.status(404).json({ message: "Cart item not found" });
      return;
    }

    const { productId: product, ...rest } = result;

    const flattenedCart = {
      ...rest,
      ...(product || {}),
    };

    res.status(200).json(flattenedCart);
  } catch (error) {
    handleError(res, error);
  }
};




export const getProductInCart = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const cartItems = await TempProducts.find()
      .populate("productId")
      .lean();

    if (!cartItems || cartItems.length === 0) {
      res.status(404).json({ message: "Cart is empty" });
      return;
    }

    const flattenedCartItems = cartItems.map(item => {
      const { productId: product, ...rest } = item;
      const flatItem = {
        ...rest,
        ...(product || {}),
      };

      const rate = Number(flatItem.unitPrice || 0);
      const qty = Number(flatItem.QTY || 0);
      const discount = Number(flatItem.discount || 0);

      // Subtotal always before VAT
      const subtotal = rate * qty - discount;

      // Always calculate VAT
      const VAT = (rate * qty * 5) / 100;

      let NetTotal = subtotal;

      if (flatItem.VATstatus === "withVAT") {
        NetTotal = subtotal + VAT;
      }

      return {
        ...flatItem,
        subtotal,
        VAT,
        NetTotal,
      };
    });

    res.status(200).json(flattenedCartItems);
  } catch (error) {
    handleError(res, error);
  }
};





// export const createSaleData = async (req: express.Request, res: express.Response): Promise<void> => {
//   try {
//     const {
//       productId,
//       customerName,
//       customerContact,
//       unitPrice,
//       discount,
//       date,
//       QTY,
//       total,
//       VAT,
//       netTotal,
//     } = req.body;

//     const requiredFields = [
//       "productId",
//       "unitPrice",
//       "date",
//       "QTY",
//       "total",
//       "VAT",
//       "netTotal",
//     ];
//     const missingFields = requiredFields.filter((field) => !req.body[field]);
//     if (missingFields.length > 0) {
//       res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
//       return;
//     }

//     let invoice = await Invoice.findOne();

//     let currentInvoiceNo: number;
//     if (invoice) {
//       currentInvoiceNo = invoice.invoiceNo;
//       invoice.invoiceNo = currentInvoiceNo + 1;
//       await invoice.save();
//     } else {
//       currentInvoiceNo = 1;
//       invoice = await Invoice.create({ invoiceNo: currentInvoiceNo });
//     }

//     const newSale = await SalesDetail.create({
//         productId: new mongoose.Types.ObjectId(productId), // important
//         customerName,
//         customerContact,
//         unitPrice,
//         discount,
//         date,
//         QTY,
//         invoiceNo: currentInvoiceNo,
//         total,
//         VAT,
//         netTotal,
//         invoice: `BS-${currentInvoiceNo}`,
//     });


//     await Sales.create({
//       productId,
//       invoiceNo: currentInvoiceNo,
//     });

//     const populatedSale = await SalesDetail.findById(newSale._id)
//     .populate("productId")
//     .lean();

//     res.status(200).send({
//       message: "Purchase Successful!",
//       ...populatedSale.toObject(),
//     });

//   } catch (error) {
//     handleError(res, error);
//   }
// };


export const createSaleData = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
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
      productId: new mongoose.Types.ObjectId(productId),
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

        const flattenedSale = {
    ...populatedSale,
    ...populatedSale.productId, 
    };

    delete flattenedSale.productId;

    res.status(200).json( flattenedSale );
  } catch (error) {
    handleError(res, error);
  }
};