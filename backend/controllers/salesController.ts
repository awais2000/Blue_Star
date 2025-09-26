import express from "express";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales"
import SalesDetail from "../models/SalesDetail"
import { handleError } from "../utils/errorHandler";
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


let invoiceNoNew;


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

    invoiceNoNew = currentInvoiceNo;

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



export const printSalesData = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    
    let invoiceNo = invoiceNoNew;
    console.log(invoiceNo);

    const latestConfig = await PrinterConfigurationModel.findOne({})
      .sort({ createdAt: -1 })
      .lean();

    if (!latestConfig?.printType) {
      res.status(404).json({ message: "Print Type not found!" });
      return;
    }

    const getSalesData = await SalesDetail.findOne({ invoiceNo }).lean();

    if (!getSalesData) {
      res.status(404).json({ message: "Invoice not found!" });
      return;
    }

    const customerName = getSalesData.customerName || "";
    const customerContact = getSalesData.customerContact || "";
    const date = new Date(getSalesData.date).toLocaleDateString();
    const grandTotal = getSalesData.grandTotal || 0;

    const itemRows = (getSalesData.products || [])
      .map((item: any) => {
        return `
          <tr>
            <td>${item.productName}</td>
            <td style="text-align:right;">${item.qty}</td>
            <td style="text-align:right;">${item.rate}</td>
            <td style="text-align:right;">${item.total}</td>
            <td style="text-align:right;">${item.netTotal}</td>
          </tr>
        `;
      })
      .join("");

    let invoiceHtml = "";

    if (latestConfig.printType === "thermal") {
      invoiceHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Thermal Invoice</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
      }
 
      .thermal {
        width: 80mm;
        font-size: 12px;
        padding: 8px;
        margin: auto;
        box-sizing: border-box;
      }
 
      /* Header */
      .header {
        text-align: center;
        border-bottom: 1px dashed #000;
        padding-bottom: 8px;
        margin-bottom: 6px;
      }
 
      .header img {
        max-width: 45px;
        margin: 0 auto 5px;
        display: block;
      }
 
      .header h3 {
        font-size: 15px;
        margin: 2px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
 
      .header p {
        font-size: 11px;
        margin: 2px 0;
        line-height: 1.3;
      }
 
      /* Info */
      .info {
        margin-bottom: 6px;
      }
 
      .info td {
        font-size: 11px;
        padding: 2px 0;
      }
 
      /* Items Table */
      .items {
        width: 100%;
        font-size: 11px;
        border-collapse: collapse;
        margin-top: 6px;
      }
 
      .items thead {
        border-bottom: 1px dashed #000;
      }
 
      .items th {
        font-weight: bold;
        padding: 3px 0;
      }
 
      .items td {
        padding: 3px 0;
        vertical-align: top;
      }
 
      .items th:nth-child(1),
      .items td:nth-child(1) {
        text-align: left;
      }
 
      .items th:nth-child(2),
      .items td:nth-child(2),
      .items th:nth-child(3),
      .items td:nth-child(3),
      .items th:nth-child(4),
      .items td:nth-child(4),
      .items th:nth-child(5),
      .items td:nth-child(5) {
        text-align: right;
      }
 
      /* Totals */
      .totals {
        width: 100%;
        font-size: 12px;
        margin-top: 8px;
        border-top: 1px dashed #000;
        padding-top: 4px;
      }
 
      .totals td {
        padding: 3px 0;
      }
 
      .totals td:first-child {
        font-weight: bold;
      }
 
      .totals td:last-child {
        text-align: right;
        font-weight: bold;
      }
 
      /* Footer */
      .footer {
        text-align: center;
        margin-top: 12px;
        font-size: 10px;
        border-top: 1px dashed #000;
        padding-top: 6px;
        line-height: 1.4;
      }
 
      .footer strong {
        display: block;
        margin-bottom: 2px;
      }
 
      .footer p {
        margin: 0;
      }
 
      /* Print */
      @media print {
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          background: #fff;
          margin: 0;
          padding: 0;
        }
        .thermal {
          box-shadow: none;
          border: none;
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="thermal">
      <!-- Header -->
      <div class="header">
        <img src="/uploads/bluestarlogo.jpg" alt="Bluestar Logo" />
        <h3>${businessConfig.rcpt_name}</h3>
        <p>${businessConfig.rcpt_address}</p>
        <p><strong>Ph:</strong> ${businessConfig.contactString}</p>
      </div>
 
      <!-- Info -->
      <table class="info">
        <tr>
          <td><strong>Date:</strong></td>
          <td>${date}</td>
        </tr>
        <tr>
          <td><strong>Customer:</strong></td>
          <td>${customerName}</td>
        </tr>
        <tr>
          <td><strong>Contact:</strong></td>
          <td>${customerContact}</td>
        </tr>
      </table>
 
      <!-- Items -->
      <table class="items">
        <thead>
          <tr>
            <th style="width:35%;">Item</th>
            <th style="width:15%;">Qty</th>
            <th style="width:20%;">Rate</th>
            <th style="width:15%;">VAT</th>
            <th style="width:25%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
 
      <!-- Totals -->
      <table class="totals">
        <tr>
          <td>Grand Total:</td>
          <td>${grandTotal}</td>
        </tr>
      </table>
 
      <!-- Footer -->
      <div class="footer">
        <strong>Thank you for your business!</strong>
        <p>Software developed with ❤️ by Hamza Amin</p>
      </div>
    </div>
  </body>
</html>`;
    }

    else if (latestConfig.printType === "A4") {
      invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>A4 Invoice</title>
  <style>
    /* Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
 
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f5f7fa;
      padding: 20px;
      color: #333;
    }
 
    .a4 {
      width: 210mm;
      min-height: 297mm;
      margin: auto;
      background: #fff;
      padding: 30px 35px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
 
    /* Header */
    .invoice-header {
      text-align: center;
      border-bottom: 3px solid #007bff;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
 
    .invoice-header img {
      width: 100px;
      height: auto;
      margin-bottom: 10px;
    }
 
    .invoice-header h1 {
      font-size: 28px;
      color: #007bff;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
 
    .invoice-header p {
      font-size: 14px;
      color: #555;
      line-height: 1.5;
    }
 
    /* Customer + Invoice Meta Info */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
    }
 
    .info-block {
      font-size: 14px;
      line-height: 1.6;
    }
 
    .info-block strong {
      display: inline-block;
      min-width: 80px;
      color: #222;
    }
 
    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 14px;
    }
 
    .items-table thead {
      background: #007bff;
      color: #fff;
    }
 
    .items-table th {
      padding: 14px 12px; /* thoda zyada spacing */
      text-align: left;
      font-weight: 600;
      letter-spacing: 0.8px; /* extra spacing letters me */
      font-size: 15px;
    }
 
    .items-table td {
      border: 1px solid #ddd;
      padding: 12px 10px;
      text-align: left;
    }
 
    .items-table tr:nth-child(even) {
      background: #f9f9f9;
    }
 
    .items-table tfoot td {
      font-weight: bold;
      background: #f1f5ff;
      border-top: 2px solid #007bff;
    }
 
    .items-table tfoot tr td:last-child {
      text-align: right;
      color: #007bff;
      font-size: 15px;
    }
 
    /* Footer */
    .invoice-footer {
      text-align: center;
      margin-top: 40px;
      font-size: 13px;
      color: #444;
    }
 
    .invoice-footer strong {
      display: block;
      margin-bottom: 6px;
      color: #000;
    }
 
    /* Print setup */
    @media print {
      body {
        background: none;
        padding: 0;
      }
      .a4 {
        box-shadow: none;
        border-radius: 0;
        width: 210mm;
        min-height: 297mm;
      }
      @page {
        size: A4;
        margin: 12mm;
      }
    }
  </style>
</head>
<body>
  <div class="a4">
    <!-- Header -->
    <div class="invoice-header">
      <!-- BlueStar Logo -->
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Blue_Star_Limited_logo.svg/512px-Blue_Sta… alt="BlueStar Logo" />
      <h1>${businessConfig.rcpt_name}</h1>
      <p>${businessConfig.rcpt_address}</p>
      <p>${businessConfig.contactString}</p>
    </div>
 
    <!-- Customer + Invoice Info -->
    <div class="info-section">
      <div class="info-block">
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Contact:</strong> ${customerContact}</p>
      </div>
      <div class="info-block">
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Invoice #:</strong> ${invoiceNo}</p>
      </div>
    </div>
 
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40%;">Product</th>
          <th style="width:15%;">Quantity</th>
          <th style="width:15%;">Rate</th>
          <th style="width:15%;">VAT</th>
          <th style="width:15%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">Grand Total</td>
          <td>${grandTotal}</td>
        </tr>
      </tfoot>
    </table>
 
    <!-- Footer -->
    <div class="invoice-footer">
      <strong>Software Developed with love by</strong>
      <p>Hamza Amin</p>
    </div>
  </div>
</body>
      </html>`;
    }

    else {
      res.status(400).send({ message: "Invalid print type. Please use 'thermal' or 'A4'." });
      return;
    }

    res.status(200).send(invoiceHtml);
  } catch (error) {
    console.error("Error printing sales data:", error);
    res.status(500).send({ message: "An unexpected error occurred." });
  }
};

// export const getSalesData = async (
//   req: express.Request,
//   res: express.Response
// ): Promise<void> => {  
//   try {
//     const limit: number = req.query.limit ? parseInt(req.query.limit as string, 10) : 10000000;
//     const page: number = req.query.page ? parseInt(req.query.page as string, 10) : 1;
//     const offset: number = (page - 1) * limit;
    
//     const toDate: Date = req.query.toDate ? new Date(parseInt(req.query.toDate as string)) : new Date();
//     const fromDate: Date = req.query.fromDate ? new Date(parseInt(req.query.fromDate as string)) : new Date(0);
//     const printType: string = req.query.printType as string;

//     if (isNaN(toDate.getTime()) || isNaN(fromDate.getTime())) {
//       res.status(400).send({ message: "Invalid date parameters" });
//       return;
//     }
    
//     const dateFilter: any = {};
//     if (req.query.fromDate) dateFilter.$gte = fromDate;
//     if (req.query.toDate) dateFilter.$lte = toDate;
    
//     const query: any = {};
//     if (Object.keys(dateFilter).length > 0) query.date = dateFilter;
    
//     const getAllInvoices = await SalesDetail.find(query)
//       .populate("products.productId")
//       .sort({ date: 1 })
//       .lean()
//       .skip(offset)
//       .limit(limit);

//     if (!getAllInvoices || getAllInvoices.length === 0) {
//       res.status(404).send({ message: "No invoices found!" });
//       return;
//     }

//     const transformedInvoices = getAllInvoices.map(invoice => {
//       // Check if invoice.products exists and is an array
//       if (!invoice.products || !Array.isArray(invoice.products)) {
//         return {
//           success: true,
//           message: "Sales data retrieved successfully",
//           customerName: invoice.customerName,
//           customerContact: invoice.customerContact,
//           products: [], // Empty array if no products
//           grandTotal: invoice.grandTotal,
//           invoiceNo: invoice.invoiceNo,
//           invoice: invoice.invoice,
//           date: invoice.date,
//           status: invoice.status,
//           _id: invoice._id,
//           createdAt: invoice.createdAt
//         };
//       }

//       return {
//         success: true,
//         message: "Sales data retrieved successfully",
//         customerName: invoice.customerName,
//         customerContact: invoice.customerContact,
//         products: invoice.products.map(product => {
//           // Check if product exists and has required fields
//           if (!product) return null;
          
//           return {
//             productId: product.productId?._id || product.productId, // Use _id if populated, otherwise original ID
//             productName: product.productName,
//             qty: product.qty,
//             rate: product.rate,
//             discount: product.discount,
//             VAT: product.VAT,
//             total: product.total,
//             netTotal: product.netTotal
//           };
//         }).filter(product => product !== null), // Remove any null products
//         grandTotal: invoice.grandTotal,
//         invoiceNo: invoice.invoiceNo,
//         invoice: invoice.invoice,
//         date: invoice.date,
//         status: invoice.status,
//         _id: invoice._id,
//         createdAt: invoice.createdAt
//       };
//     });

//     res.status(200).send(transformedInvoices);
  
//   } catch (error) {
//     handleError(res, error);
//   }
// }



// Assuming express and other imports are available
// import * as express from 'express'; 
// Assuming SalesDetail, handleError, and businessConfig are defined elsewhere

export const getSalesData = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    const limit: number = req.query.limit ? parseInt(req.query.limit as string, 10) : 10000000;
    const page: number = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const offset: number = (page - 1) * limit;

    // Dates are expected as Unix timestamps (milliseconds)
    const toDate: Date = req.query.toDate ? new Date(parseInt(req.query.toDate as string)) : new Date();
    const fromDate: Date = req.query.fromDate ? new Date(parseInt(req.query.fromDate as string)) : new Date(0);
    const printType: string = req.query.printType as string;

    if (isNaN(toDate.getTime()) || isNaN(fromDate.getTime())) {
      res.status(400).send({ message: "Invalid date parameters" });
      return;
    }

    const dateFilter: any = {};
    // Only apply the date filter if the query parameter was actually provided
    if (req.query.fromDate) dateFilter.$gte = fromDate;
    if (req.query.toDate) dateFilter.$lte = toDate;

    const query: any = {};
    if (Object.keys(dateFilter).length > 0) query.date = dateFilter;

    const getAllInvoices = await SalesDetail.find(query)
      .populate("products.productId")
      .sort({ date: 1 })
      .lean()
      .skip(offset)
      .limit(limit);

    if (!getAllInvoices || getAllInvoices.length === 0) {
      res.status(404).send({ message: "No invoices found!" });
      return;
    }

    // --- Data Transformation ---
    const transformedInvoices = getAllInvoices.map(invoice => {
      // Safely access product data
      const products = (invoice.products || [])
        .map(product => {
          if (!product) return null;

          // Populate logic ensures product.productId is the populated object or just the ID
          const productId = (product.productId as any)?._id || product.productId;

          return {
            productId: productId,
            productName: product.productName,
            qty: product.qty,
            rate: product.rate,
            discount: product.discount,
            VAT: product.VAT,
            total: product.total, // Item total before discount
            netTotal: product.netTotal // Final item total after all calculations
          };
        })
        .filter(product => product !== null);

      return {
        customerName: invoice.customerName,
        customerContact: invoice.customerContact,
        products: products,
        grandTotal: invoice.grandTotal,
        invoiceNo: invoice.invoiceNo,
        invoice: invoice.invoice,
        date: invoice.date,
        status: invoice.status,
        _id: invoice._id,
        createdAt: invoice.createdAt
      };
    });

    // --- HTML Generation and Response ---

    if (printType === 'thermal' || printType === 'A4') {
      res.setHeader('Content-Type', 'text/html');

      const htmlInvoices = transformedInvoices.map(invoice => {
        const {
          customerName = "",
          customerContact = "",
          invoiceNo = "",
          date = "",
          grandTotal = 0,
          products = []
        } = invoice;

        // Build product rows
        // NOTE: Using netTotal for the final column
        const itemRows = products.map(p => `
          <tr>
            <td style="text-align: left;">${p.productName || ''}</td>
            <td style="text-align: right;">${p.qty}</td>
            <td style="text-align: right;">${p.rate}</td>
            <td style="text-align: right;">${p.VAT}</td>
            <td style="text-align: right;">${p.netTotal}</td>
          </tr>
        `).join("");

        let htmlTemplate = "";

        // --- Thermal Template (FIXED) ---
        if (printType === "thermal") {
          htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Thermal Invoice</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
      }
 
      .thermal {
        width: 80mm;
        font-size: 12px;
        padding: 8px;
        margin: auto;
        box-sizing: border-box;
      }
 
      /* Header */
      .header {
        text-align: center;
        border-bottom: 1px dashed #000;
        padding-bottom: 8px;
        margin-bottom: 6px;
      }
 
      .header img {
        max-width: 45px;
        margin: 0 auto 5px;
        display: block;
      }
 
      .header h3 {
        font-size: 15px;
        margin: 2px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
 
      .header p {
        font-size: 11px;
        margin: 2px 0;
        line-height: 1.3;
      }
 
      /* Info */
      .info {
        margin-bottom: 6px;
      }
 
      .info td {
        font-size: 11px;
        padding: 2px 0;
      }
 
      /* Items Table */
      .items {
        width: 100%;
        font-size: 11px;
        border-collapse: collapse;
        margin-top: 6px;
      }
 
      .items thead {
        border-bottom: 1px dashed #000;
      }
 
      .items th {
        font-weight: bold;
        padding: 3px 0;
      }
 
      .items td {
        padding: 3px 0;
        vertical-align: top;
      }
 
      .items th:nth-child(1),
      .items td:nth-child(1) {
        text-align: left;
      }
 
      .items th:nth-child(2),
      .items td:nth-child(2),
      .items th:nth-child(3),
      .items td:nth-child(3),
      .items th:nth-child(4),
      .items td:nth-child(4),
      .items th:nth-child(5),
      .items td:nth-child(5) {
        text-align: right;
      }
 
      /* Totals */
      .totals {
        width: 100%;
        font-size: 12px;
        margin-top: 8px;
        border-top: 1px dashed #000;
        padding-top: 4px;
      }
 
      .totals td {
        padding: 3px 0;
      }
 
      .totals td:first-child {
        font-weight: bold;
      }
 
      .totals td:last-child {
        text-align: right;
        font-weight: bold;
      }
 
      /* Footer */
      .footer {
        text-align: center;
        margin-top: 12px;
        font-size: 10px;
        border-top: 1px dashed #000;
        padding-top: 6px;
        line-height: 1.4;
      }
 
      .footer strong {
        display: block;
        margin-bottom: 2px;
      }
 
      .footer p {
        margin: 0;
      }
 
      /* Print */
      @media print {
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          background: #fff;
          margin: 0;
          padding: 0;
        }
        .thermal {
          box-shadow: none;
          border: none;
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="thermal">
      <!-- Header -->
      <div class="header">
        <img src="/uploads/bluestarlogo.jpg" alt="Bluestar Logo" />
        <h3>${businessConfig.rcpt_name}</h3>
        <p>${businessConfig.rcpt_address}</p>
        <p><strong>Ph:</strong> ${businessConfig.contactString}</p>
      </div>
 
      <!-- Info -->
      <table class="info">
        <tr>
          <td><strong>Date:</strong></td>
          <td>${date}</td>
        </tr>
        <tr>
          <td><strong>Customer:</strong></td>
          <td>${customerName}</td>
        </tr>
        <tr>
          <td><strong>Contact:</strong></td>
          <td>${customerContact}</td>
        </tr>
      </table>
 
      <!-- Items -->
      <table class="items">
        <thead>
          <tr>
            <th style="width:35%;">Item</th>
            <th style="width:15%;">Qty</th>
            <th style="width:20%;">Rate</th>
            <th style="width:15%;">VAT</th>
            <th style="width:25%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
 
      <!-- Totals -->
      <table class="totals">
        <tr>
          <td>Grand Total:</td>
          <td>${grandTotal}</td>
        </tr>
      </table>
 
      <!-- Footer -->
      <div class="footer">
        <strong>Thank you for your business!</strong>
        <p>Software developed with ❤️ by Hamza Amin</p>
      </div>
    </div>
  </body>
</html>`;
        }
        // --- A4 Template (No changes) ---
        else if (printType === 'A4') {
          htmlTemplate = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <title>A4 Invoice</title>
              <style>
                body {
                  font-family: "Segoe UI", Arial, sans-serif;
                  background: #f5f7fa;
                  padding: 20px;
                  color: #333;
                }
                .a4 {
                  width: 210mm;
                  min-height: 297mm;
                  margin: auto;
                  background: #fff;
                  padding: 30px 35px;
                  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                  border-radius: 8px;
                }
                .invoice-header {
                  text-align: center;
                  border-bottom: 3px solid #007bff;
                  padding-bottom: 15px;
                  margin-bottom: 25px;
                }
                .invoice-header img {
                  width: 100px;
                  height: auto;
                  margin-bottom: 10px;
                }
                .invoice-header h1 {
                  font-size: 28px;
                  color: #007bff;
                  margin-bottom: 8px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                .info-section {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 25px;
                }
                .info-block {
                  font-size: 14px;
                  line-height: 1.6;
                }
                .info-block strong {
                  display: inline-block;
                  min-width: 80px;
                  color: #222;
                }
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                  font-size: 14px;
                }
                .items-table thead {
                  background: #007bff;
                  color: #fff;
                }
                .items-table th {
                  padding: 14px 12px;
                  text-align: left;
                }
                .items-table td {
                  border: 1px solid #ddd;
                  padding: 12px 10px;
                  text-align: left;
                }
                .items-table tr:nth-child(even) {
                  background: #f9f9f9;
                }
                .items-table tfoot td {
                  font-weight: bold;
                  background: #f1f5ff;
                  border-top: 2px solid #007bff;
                }
                .items-table tfoot tr td:last-child {
                  text-align: right;
                  color: #007bff;
                }
                .invoice-footer {
                  text-align: center;
                  margin-top: 40px;
                  font-size: 13px;
                  color: #444;
                }
                .invoice-footer strong {
                  display: block;
                  margin-bottom: 6px;
                  color: #000;
                }
                @media print {
                    .a4 {
                        box-shadow: none;
                    }
                }
              </style>
            </head>
            <body>
              <div class="a4">
                <div class="invoice-header">
                  <img src="/uploads/bluestarlogo.jpg" alt="Bluestar Logo" />
                  <h1>${(businessConfig as any).rcpt_name}</h1>
                  <p>${(businessConfig as any).rcpt_address}</p>
                  <p>${(businessConfig as any).contactString}</p>
                </div>
                <div class="info-section">
                  <div class="info-block">
                    <p><strong>Customer:</strong> ${customerName}</p>
                    <p><strong>Contact:</strong> ${customerContact}</p>
                  </div>
                  <div class="info-block">
                    <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                    <p><strong>Invoice #:</strong> ${invoiceNo}</p>
                  </div>
                </div>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width:40%;">Product</th>
                      <th style="width:15%;">Quantity</th>
                      <th style="width:15%;">Rate</th>
                      <th style="width:15%;">VAT</th>
                      <th style="width:15%;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="4">Grand Total</td>
                      <td>${grandTotal}</td>
                    </tr>
                  </tfoot>
                </table>
                <div class="invoice-footer">
                  <strong>Software Developed with ❤️ by</strong>
                  <p>Hamza Amin</p>
                </div>
              </div>
            </body>
            </html>
          `;
        }

        return htmlTemplate;
      });

      // Send multiple invoices in one HTML doc, separated by a page break for printing
      res.status(200).send(htmlInvoices.join("<div style='page-break-after:always;'></div>"));
      return; // Add return to prevent falling through
    }

    // Default response for JSON data if no printType is specified or it's not 'thermal'/'A4'
    res.status(200).json({
      success: true,
      message: "Sales data retrieved successfully",
      data: transformedInvoices,
    });


  } catch (error) {
    // Ensure you have a global or local handleError function defined
    handleError(res, error);
  }
};
