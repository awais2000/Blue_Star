import express from "express";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales"
import SalesDetail from "../models/SalesDetail"
import { handleError } from "../utils/errorHandler";
import mongoose from "mongoose";
import TempProducts from "../models/tempProducts";
import PrinterConfigurationModel from "../models/printerConfiguration";



const businessConfig = {
    rcpt_name: 'Blue Star Electronics Repair L.L.C',
    rcpt_address: 'Baniyas East 9 Near Shahab Baniyas Cafeteria',
    contactString: '+971554831700',
};




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
    const { customerName, customerContact, grandTotal } = req.body;

    const tempProducts = await TempProducts.find()
      .populate("productId")
      .lean();

    if (!tempProducts || tempProducts.length === 0) {
      res.status(400).json({ message: "Cart is empty. Add products first." });
      return;
    }

    const productsArray = tempProducts.map((item) => {
      const { productId: products } = item;
      const rate = Number(item.unitPrice || 0);
      const qty = Number(item.QTY || 0);
      const discount = Number(item.discount || 0);

      const VAT = (rate * qty * 5) / 100;
      const total = rate * qty - discount;
      const netTotal = total + VAT;

      return {
        productId: products?._id,
        productName: typeof products === "object" && "productName" in products ? (products as any).productName : "Unknown Product",
        qty,
        rate,
        discount,
        VAT,
        total,
        netTotal,
      };
    });

    let invoice = await Invoice.findOne();
    let currentInvoiceNo: number;

    if (invoice) {
      currentInvoiceNo = invoice.invoiceNo + 1;
      invoice.invoiceNo = currentInvoiceNo;
      await invoice.save();
    } else {
      currentInvoiceNo = 1;
      invoice = await Invoice.create({ invoiceNo: currentInvoiceNo });
    }

    const newSale = await SalesDetail.create({
      customerName,
      customerContact,
      products: productsArray,
      grandTotal,
      invoiceNo: currentInvoiceNo,
      invoice: `BS-${currentInvoiceNo}`,
      date: new Date(),
    });

    await TempProducts.deleteMany({});

    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      ...newSale.toObject(),
    });
  } catch (error) {
    handleError(res, error);
  }
};





// export const printSalesData = async (req: express.Request, res: express.Response): Promise<void> => {
//   try {
//     const { invoiceNo } = req.body;

//     const latestConfig = await PrinterConfigurationModel.findOne({})
//       .sort({ createdAt: -1 })
//       .lean();

//     if (!latestConfig?.printType) {
//       res.status(404).json({ message: "Print Type not found!" });
//       return;
//     }

//     const getSalesData = await SalesDetail.findOne({ invoiceNo })
//       .populate("items.productId")
//       .lean();

//     if (!getSalesData) {
//       res.status(404).json({ message: "Invoice not found!" });
//       return;
//     }

//     const customerName = getSalesData.customerName || "";
//     const customerContact = getSalesData.customerContact || "";
//     const date = new Date(getSalesData.date).toLocaleDateString();
//     const total = getSalesData.total || 0;
//     const discount = getSalesData.discount || 0;
//     const VAT = getSalesData.VAT || 0;
//     const netTotal = getSalesData.netTotal || 0;

//     const itemRows = (getSalesData.items || [])
//       .map((item: any) => {
//         const product: any = item.productId || {};
//         const name = product.productName || "";
//         const qty = item.qty || 0;
//         const price = item.unitPrice || 0;

//         return `
//           <tr>
//             <td>${name}</td>
//             <td style="text-align:right;">${qty}</td>
//             <td style="text-align:right;">${price}</td>
//           </tr>
//         `;
//       })
//       .join("");

//     let invoiceHtml = "";

// if (latestConfig.printType === "thermal") {
//   invoiceHtml = `
//   <!DOCTYPE html>
//   <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <title>Thermal Invoice</title>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
//           .thermal {
//             width: 80mm;
//             font-size: 12px;
//             padding: 10px;
//             margin: 10px auto;
//             border: 1px solid #000;
//             box-sizing: border-box;
//           }
//           .thermal table { width: 100%; font-size: 11px; border-collapse: collapse; }
//           .thermal th, .thermal td { padding: 2px 0; }
//           .thermal thead tr { border-bottom: 1px dashed #000; }
//           .thermal tfoot tr { border-top: 1px dashed #000; }
//           @media print { @page { size: 80mm auto; margin: 0; } }
//         </style>
//       </head>
//       <body>
//         <div class="thermal">
//           <img src="/uploads/bluestarlogo.jpg" alt="Bluestar Logo" style="max-width:50px; display:block; margin:0 auto;" />
//           <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px;">
//             <h3>${businessConfig.rcpt_name}</h3>
//             <p style="font-size: 10px;"><strong>Address:</strong> ${businessConfig.rcpt_address}</p>
//             <p><strong>Ph:</strong> ${businessConfig.contactString}</p>
//           </div>
//           <table>
//             <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
//             <tr><td><strong>Customer:</strong></td><td>${customerName}</td></tr>
//             <tr><td><strong>Contact:</strong></td><td>${customerContact}</td></tr>
//           </table>
//           <table style="margin-top:10px; border-top:1px dashed #000;">
//             <thead>
//               <tr>
//                 <th style="text-align:left;">Item</th>
//                 <th style="text-align:right;">Qty</th>
//                 <th style="text-align:right;">Price</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${itemRows}
//             </tbody>
//           </table>
//           <table style="margin-top:10px;">
//             <tr><td><strong>Total:</strong></td><td style="text-align:right;">${total}</td></tr>
//             <tr><td><strong>Discount:</strong></td><td style="text-align:right;">${discount}</td></tr>
//             <tr><td><strong>VAT:</strong></td><td style="text-align:right;">${VAT}</td></tr>
//             <tr><td><strong>Net Total:</strong></td><td style="text-align:right;">${netTotal}</td></tr>
//           </table>
//           <div style="text-align:center; margin-top:10px; font-size:10px;">
//             <p><strong>Software Developed with love by</strong></p>
//             <h6><a href="https://technicmentors.com/" target="_blank">Friendz&Co</a></h6>
//           </div>
//         </div>
//       </body>
//       </html>`;
//     }

//     else if (latestConfig.printType === "A4") {
//       invoiceHtml = `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <title>A4 Invoice</title>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
//           .a4 {
//             width: 210mm;
//             min-height: 297mm;
//             padding: 20px;
//             border: 1px solid #000;
//             margin: 0 auto;
//           }
//           .a4 table { width: 100%; border-collapse: collapse; }
//           .a4 th, .a4 td { border: 1px solid #000; padding: 6px; }
//           @media print { @page { size: A4; margin: 10mm; } }
//         </style>
//       </head>
//       <body>
//         <div class="a4">
//           <div style="text-align: center;">
//             <h2>${businessConfig.rcpt_name}</h2>
//             <p>${businessConfig.rcpt_address}</p>
//             <p>${businessConfig.contactString}</p>
//           </div>
//           <table style="margin-top:20px;">
//             <tr><td><strong>Customer:</strong></td><td>${customerName}</td></tr>
//             <tr><td><strong>Contact:</strong></td><td>${customerContact}</td></tr>
//             <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
//           </table>
//           <table style="margin-top:20px;">
//             <thead>
//               <tr>
//                 <th>Product</th>
//                 <th>Quantity</th>
//                 <th>Unit Price</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${itemRows}
//             </tbody>
//             <tfoot>
//               <tr>
//                 <td><strong>Total:</strong></td>
//                 <td colspan="2" style="text-align:right;">${total}</td>
//               </tr>
//             </tfoot>
//           </table>
//           <table style="margin-top:20px;">
//             <tr><td><strong>Discount:</strong></td><td>${discount}</td></tr>
//             <tr><td><strong>VAT:</strong></td><td>${VAT}</td></tr>
//             <tr><td><strong>Net Total:</strong></td><td>${netTotal}</td></tr>
//           </table>
//           <div style="text-align:center; margin-top:20px;">
//             <p><strong>Software Developed with love by</strong></p>
//             <h6><a href="https://technicmentors.com/" target="_blank">Technic Mentors</a></h6>
//           </div>
//         </div>
//       </body>
//       </html>`;
//     }

//     else {
//       res.status(400).send({ message: "Invalid print type. Please use 'thermal' or 'A4'." });
//       return;
//     }

//     res.status(200).send(invoiceHtml);
//   } catch (error) {
//     console.error("Error creating sale data:", error);
//     res.status(500).send({ message: "An unexpected error occurred." });
//   }
// };