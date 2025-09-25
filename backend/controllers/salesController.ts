import express from "express";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales"
import SalesDetail from "../models/SalesDetail"
import { handleError } from "../utils/errorHandler";
import mongoose from "mongoose";
import TempProducts from "../models/tempProducts";



export const addProductToCart = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { productId, QTY, unitPrice, discount, VATstatus } = req.body;

    const requiredFields = ["productId", "QTY", "unitPrice", "VATstatus",];
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
      VATstatus,
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





// export const getProductInCart = async (req: express.Request, res: express.Response): Promise<void> => {
//   try {
//     const cartItems = await TempProducts.find()
//       .populate("productId")
//       .lean();

//     if (!cartItems || cartItems.length === 0) {
//       res.status(404).json({ message: "Cart is empty" });
//       return;
//     }

//     const allItems: any[] = [];

//     cartItems.forEach(item => {
//       const { productId: product, ...rest } = item;
//       const flatItem = {
//         ...rest,
//         ...(product || {}),
//       };

//       const rate = Number(flatItem.unitPrice || 0);
//       const qty = Number(flatItem.QTY || 0);
//       const discount = Number(flatItem.discount || 0);
//       const selectVAT = flatItem.VATstatus === "withVAT";

//       // Always calculate VAT from ORIGINAL rate
//       const VATtax = (rate * qty * 5) / 100;

//       // The 'total' calculation remains the same
//       const total = selectVAT
//         ? (rate * qty) - discount
//         : ((rate - (rate * 5) / 100) * qty) - discount;

//       let netTotal = 0;

//       // The new logic for netTotal based on your request
//       if (selectVAT) {
//         netTotal = total + VATtax;
//       } else {
//         // For "withoutVAT", subtract VAT from original total and then add it back
//         const originalTotal = (rate * qty) - discount;
//         const totalWithoutVAT = originalTotal - VATtax;
//         netTotal = totalWithoutVAT + VATtax;
//       }

//       allItems.push({
//         productName: (product as any)?.productName,
//         qty,
//         rate,
//         discount,
//         VAT: VATtax,
//         total,
//         netTotal,
//       });
//     });

//     const grandTotal = allItems.reduce((acc, item) => acc + (item.netTotal || 0), 0);

//     res.status(200).json({
//       items: allItems,
//       grandTotal,
//     });
//   } catch (error) {
//     handleError(res, error);
//   }
// };
export const getProductInCart = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const cartItems = await TempProducts.find()
      .populate("productId")
      .lean();

    if (!cartItems || cartItems.length === 0) {
      res.status(404).json({ message: "Cart is empty" });
      return;
    }

    const allItems: any[] = [];

    cartItems.forEach(item => {
      const { productId: product, ...rest } = item;

      const rate = Number(rest.unitPrice || 0);
      const qty = Number(rest.QTY || 0);
      const discount = Number(rest.discount || 0);
      const selectVAT = rest.VATstatus === "withVAT";

      // Always calculate VAT from ORIGINAL rate
      const VATtax = (rate * qty * 5) / 100;

      // Total depends on VAT status
      const total = selectVAT
        ? (rate * qty) - discount
        : ((rate - (rate * 5) / 100) * qty) - discount;

      let netTotal = 0;

      if (selectVAT) {
        netTotal = total + VATtax;
      } else {
        const originalTotal = (rate * qty) - discount;
        const totalWithoutVAT = originalTotal - VATtax;
        netTotal = totalWithoutVAT + VATtax;
      }

      allItems.push({
        productId: (product as any)?._id,        // ✅ keep productId
        productName: (product as any)?.productName,
        qty,
        rate,
        discount,
        VAT: VATtax,
        total,
        netTotal,
      });
    });

    const grandTotal = allItems.reduce((acc, item) => acc + (item.netTotal || 0), 0);

    res.status(200).json({
      items: allItems,
      grandTotal,
    });
  } catch (error) {
    handleError(res, error);
  }
};




export const deleteFromCart = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = req.params.id;

    const deleteProduct = await TempProducts.findOneAndDelete({ productId: id });

    if (!deleteProduct) {
      res.status(404).json({ message: "Product not found in cart" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product removed from cart successfully",
      ...deleteProduct.toObject(),
    });
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