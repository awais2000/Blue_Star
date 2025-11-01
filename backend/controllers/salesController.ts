import express from "express";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales"
import SalesDetail from "../models/SalesDetail"
import { handleError } from "../utils/errorHandler";
import TempProducts from "../models/tempProducts";
import PrinterConfigurationModel from "../models/printerConfiguration";
import { formatCurrency } from "../utils/priceFormat";
import { roundToTwoDecimals } from '../utils/priceFormat2'; 
import { formatDateTime } from "../utils/timeFormat"





const businessConfig = {
    rcpt_name: 'BLUE STAR ELECTRONICS REPAIR SOLE PROPRIETORSHIP LLC',
    rcpt_address: 'Baniyas East 9 Near Shabab Baniyas Cafeteria',
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
//     try {
//         const cartItems = await (TempProducts as any).find()
//             .populate("productId")
//             .lean();

//         if (!cartItems || cartItems.length === 0) {
//             res.status(404).json({ items: [], grandTotal: 0 }); // Better 404 response
//             return;
//         }

//         const allItems: any[] = [];

//         let anotherDiscount = 0;

//         cartItems.forEach(item => {
//             const { productId: product, ...rest } = item;

//             const rate = Number(rest.unitPrice || 0);
//             const qty = Number(rest.QTY || 0);
//             const discount = Number(rest.discount || 0);
//             const selectVAT = rest.VATstatus === "withVAT"; 

//             const baseTotalExclDisc = rate * qty;
//             const VATtax = roundToTwoDecimals((baseTotalExclDisc * 5) / 100);

//             let total: number;        
//             let netTotal: number;     // Item Net Total (Final Price)
//             let finalDiscount: number; // Discount value to return

//             //withoutVAT
//             if (selectVAT) {
                
//                 total = roundToTwoDecimals(baseTotalExclDisc - discount);
                
//                 netTotal = roundToTwoDecimals(total + VATtax);
                
//                 finalDiscount = discount; // Return original discount amount
//             } else {
//                 // withVAT
//                 finalDiscount = roundToTwoDecimals(discount + VATtax); 

//                 total = roundToTwoDecimals(baseTotalExclDisc - discount) - VATtax; 
//                 anotherDiscount = discount;

//                 netTotal = roundToTwoDecimals(baseTotalExclDisc); 
//             }

//             allItems.push({
//                 productId: (product as any)?._id,
//                 productName: (product as any)?.productName,
//                 qty,
//                 rate: roundToTwoDecimals(rate),
//                 discount: finalDiscount, 
//                 VAT: VATtax,
//                 total,
//                 netTotal,
//             });
//         });

//         const newgrandTotal = roundToTwoDecimals(
//             allItems.reduce((acc, item) => acc + (item.netTotal || 0), 0)
//         );

//         const grandTotal = newgrandTotal - anotherDiscount;

//         console.log("anotherDiscount", anotherDiscount);

//         res.status(200).json({
//             items: allItems,
//             grandTotal,
//         });
//     } catch (error) {
//         (handleError as any)(res, error);
//     }
// };



export const getProductInCart = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
        const cartItems = await (TempProducts as any).find()
            .populate("productId")
            .lean();

        if (!cartItems || cartItems.length === 0) {
            res.status(404).json({ items: [], grandTotal: 0 }); // Better 404 response
            return;
        }

        const allItems: any[] = [];

        let anotherDiscount = 0;

        cartItems.forEach(item => {
            const { productId: product, ...rest } = item;

            let rate = Number(rest.unitPrice || 0);
            const qty = Number(rest.QTY || 0);
            const discount = Number(rest.discount || 0);
            const selectVAT = rest.VATstatus === "withVAT"; 

            const baseTotalExclDisc = rate * qty;
            const VATtax = roundToTwoDecimals((baseTotalExclDisc * 5) / 100);

            let total: number;        
            let netTotal: number;     // Item Net Total (Final Price)
            let finalDiscount: number; // Discount value to return

            //withoutVAT
            if (selectVAT) {
                
                total = roundToTwoDecimals(baseTotalExclDisc - discount);
                
                netTotal = roundToTwoDecimals(total + VATtax);
                
                finalDiscount = discount; // Return original discount amount
            } else {
                // withVAT
                let  withRate = Number(rest.unitPrice || 0);
                
                withRate -= VATtax/qty;  //95

                rate = withRate;  //95

                const baseTotalExclDisc2 = withRate * qty; //95 * 1

                finalDiscount = roundToTwoDecimals(discount);  

                total = roundToTwoDecimals(baseTotalExclDisc2 - discount); 

                anotherDiscount = discount;

                netTotal = roundToTwoDecimals(baseTotalExclDisc); 
            }

            allItems.push({
                productId: (product as any)?._id,
                productName: (product as any)?.productName,
                qty,
                rate: roundToTwoDecimals(rate),
                discount: finalDiscount, 
                VAT: VATtax,
                total,
                netTotal,
            });
        });

        const newgrandTotal = roundToTwoDecimals(
            allItems.reduce((acc, item) => acc + (item.netTotal || 0), 0)
        );

        const grandTotal = newgrandTotal - anotherDiscount;

        console.log("anotherDiscount", anotherDiscount);

        res.status(200).json({
            items: allItems,
            grandTotal,
        });
    } catch (error) {
        (handleError as any)(res, error);
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
    const { customerName, customerContact, customerTRN, grandTotal, date } = req.body;

    const tempProducts = await TempProducts.find()
      .populate("productId")
      .lean();

      const vatstatus = tempProducts.length > 0 ? tempProducts[0].VATstatus : undefined;

      console.log(vatstatus);

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
      customerTRN,
      products: productsArray,
      grandTotal,
      invoiceNo: currentInvoiceNo,
      invoice: `${currentInvoiceNo}`,
      date: date,
      vatStatus: vatstatus,
    });

    invoiceNoNew = currentInvoiceNo;

    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      ...newSale.toObject(),
    });
  } catch (error) {
    handleError(res, error);
  }
};


// export const printSalesData = async (
//   req: express.Request,
//   res: express.Response
// ): Promise<void> => {
//   try {
//      let invoiceNo = invoiceNoNew;
//      console.log(invoiceNo);

//     if (!invoiceNo) {
//       res.status(400).send({ message: "Please provide the Invoice Number!" });
//       return;
//     }

//     const latestConfig = await (PrinterConfigurationModel as any).findOne({})
//       .sort({ createdAt: -1 })
//       .lean();

//     const getvatstatus = await (TempProducts as any).findOne({}).sort({ createdAt: -1 }).lean();

//     if (!latestConfig?.printType) {
//       res.status(404).json({ message: "Print Type not found!" });
//       return;
//     }

//     const getSalesData = await (SalesDetail as any).findOne({ invoiceNo: invoiceNo })
//       .populate("products.productId")
//       .lean();

//     if (!getSalesData) {
//       res.status(404).send({ message: `Invoice with number ${invoiceNo} not found!` });
//       return;
//     }

//     const customerName = getSalesData.customerName || "";
//     const customerContact = getSalesData.customerContact || "";
//     const customerTRN = getSalesData.customerTRN || "Nil";
//     const date = new Date(getSalesData.date).toLocaleDateString();
//     const grandTotalFromDB = getSalesData.grandTotal || 0; // Use DB value as fallback
//     const realtime = getSalesData.createdAt || 0;
//     const theTime = formatDateTime(realtime);
//     console.log(theTime);

//     let itemRows = "";
//     let sumOfTotal = 0; // Summary Total (Base Price * Qty)
//     let sumOfVat = 0;   // Summary VAT (Total VAT amount)
//     let newDiscount = 0; // Discount amount for the 'Disc' summary line
//     let totalDiscountSum = 0; // Total sum of all discounts (for accurate final calculation)

//     // Calculate unformatted sums needed for final totals
//     sumOfTotal = (getSalesData.products || []).reduce(
//       (acc: number, item: any) => acc + (Number(item.rate || 0) * Number(item.qty || 0)),
//       0
//     );

//     sumOfVat = (getSalesData.products || []).reduce(
//       (acc: number, item: any) => acc + Number(item.VAT || 0),
//       0
//     );
    
//     totalDiscountSum = (getSalesData.products || []).reduce(
//       (acc: number, item: any) => acc + Number(item.discount || 0),
//       0
//     );


//     // --- Conditional Item Row Mapping ---
//     if (getvatstatus?.VATstatus === "withoutVAT") {
//       itemRows = (getSalesData.products || [])
//         .map((item: any) => {
//           const itemRate = formatCurrency(item.rate);
//           const vatAmount = formatCurrency(item.VAT);

//           // Rule: Line Item Total = (Price * Qty) + VAT (NO DISCOUNT)
//           const itemBasePrice = Number(item.rate) * Number(item.qty);
//           const itemNetTotalValue = itemBasePrice + Number(item.VAT);
//           const itemNetTotal = formatCurrency(itemNetTotalValue); 
          
//           return `
//             <tr>
//               <td>${item.productName}</td>
//               <td style="text-align:right;">${item.qty}</td>
//               <td style="text-align:right;">${itemRate}</td>
//               <td style="text-align:right;">${vatAmount}</td>
//               <td style="text-align:right;">${itemNetTotal}</td>
//             </tr>
//           `;
//         })
//         .join("");

//       // Display Discount: Use the simple total discount sum
//       newDiscount = totalDiscountSum + sumOfVat; 
      
//     } else { // WITH VAT (Standard Scenario from Image)
//       itemRows = (getSalesData.products || [])
//         .map((item: any) => {
//           const itemRate = formatCurrency(item.rate);
//           const vatAmount = formatCurrency(item.VAT);
          
//           // Rule: Line Item Total = VAT + (Price * Qty) - NO DISCOUNT
//           const itemBasePrice = Number(item.rate) * Number(item.qty);
//           const itemNetTotalValue = itemBasePrice + Number(item.VAT);
//           const itemNetTotal = formatCurrency(itemNetTotalValue); 
          
//           return `
//             <tr>
//               <td>${item.productName}</td>
//               <td style="text-align:right;">${item.qty}</td>
//               <td style="text-align:right;">${itemRate}</td>
//               <td style="text-align:right;">${vatAmount}</td>
//               <td style="text-align:right;">${itemNetTotal}</td>
//             </tr>
//           `;
//         })
//         .join("");

//       // Display Discount: Use the simple total discount
//       newDiscount = totalDiscountSum; 
//     }

//     // --- Final Grand Total Calculation ---
//     // Rule: Grand Total = Total (Base Price Sum) + Total VAT - Total Discount
//     const calculatedGrandTotal = Number(sumOfTotal) + Number(sumOfVat) - Number(newDiscount);
    
//     // --- Final Formatting of Totals for HTML Injection ---
//     // These variables will be injected into the HTML templates
//     const finalGrandTotal = formatCurrency(calculatedGrandTotal);
//     const formattedSumOfTotal = formatCurrency(sumOfTotal);
//     const formattedSumOfVat = formatCurrency(sumOfVat);
//     const formattedNewDiscount = formatCurrency(newDiscount);


//     let invoiceHtml = "";

//     if (latestConfig.printType === "thermal") {
//       invoiceHtml = 
//       `<!DOCTYPE html>
//       <html lang="en">
//         <head>
//           <meta charset="UTF-8" />
//           <title>Thermal Invoice</title>
//           <style>
//             body {
//               font-family: "Segoe UI", Arial, sans-serif;
//               margin: 0;
//               padding: 0;
//               background: #fff;
//               color: #000;
//             }
      
//             .thermal {
//               width: 65mm;
//               min-height: 110mm;
//               font-size: 12px;
//               padding: 8px;
//               margin: auto;
//               box-sizing: border-box;
//             }
      
//             /* Header */
//             .header {
//               text-align: center;
//               border-bottom: 1px dashed #000;
//               padding-bottom: 8px;
//               margin-bottom: 6px;
//             }
      
//             .header img {
//               max-width: 45px;
//               margin: 0 auto 5px;
//               display: block;
//             }
      
//             .header h3 {
//               font-size: 15px;
//               margin: 2px 0;
//               text-transform: uppercase;
//               letter-spacing: 1px;
//             }
      
//             .header p {
//               font-size: 11px;
//               margin: 2px 0;
//               line-height: 1.3;
//             }
      
//             /* Info */
//             .info {
//               margin-bottom: 6px;
//             }
      
//             .info td {
//               font-size: 11px;
//               padding: 2px 0;
//             }
      
//             /* Items Table */
//             .items {
//               width: 100%;
//               font-size: 11px;
//               border-collapse: collapse;
//               margin-top: 6px;
//             }
      
//             .items thead {
//               border-bottom: 1px dashed #000;
//             }
      
//             .items th {
//               font-weight: bold;
//               padding: 3px 4px; /* left-right spacing add kiya */
//               white-space: nowrap; /* text break nahi hoga */
//             }
      
//             .items td {
//               padding: 3px 4px;
//               vertical-align: top;
//             }
      
//             .items th:nth-child(1),
//             .items td:nth-child(1) {
//               text-align: left;
//             }
      
//             .items th:nth-child(2),
//             .items td:nth-child(2),
//             .items th:nth-child(3),
//             .items td:nth-child(3),
//             .items th:nth-child(4),
//             .items td:nth-child(4),
//             .items th:nth-child(5),
//             .items td:nth-child(5) {
//               text-align: right;
//             }
      
//             /* Totals */
//             .totals {
//               width: 100%;
//               font-size: 12px;
//               margin-top: 8px;
//               border-top: 1px dashed #000;
//               padding-top: 4px;
//             }
      
//             .totals td {
//               padding: 3px 0;
//             }
      
//             .totals td:first-child {
//               font-weight: bold;
//             }
      
//             .totals td:last-child {
//               text-align: right;
//               font-weight: bold;
//             }
      
//             /* Footer */
//             .footer {
//               text-align: center;
//               margin-top: 12px;
//               font-size: 10px;
//               border-top: 1px dashed #000;
//               padding-top: 6px;
//               line-height: 1.4;
//             }
      
//             .footer strong {
//               display: block;
//               margin-bottom: 2px;
//             }
      
//             .footer p {
//               margin: 0;
//             }
      
//             /* Print */
//             @media print {
//               @page {
//                 size: 80mm auto;
//                 margin: 0;
//               body {
//                 background: #fff;
//                 margin: 0;
//                 padding: 0;
//               }
//               .thermal {
//                 box-shadow: none;
//                 border: none;
//                 margin: 0;
//               }
//             }
//           </style>
//         </head>
//         <body>
//           <div class="thermal">
//             <!-- Header -->
//             <div class="header">
//               <h3>${businessConfig.rcpt_name}</h3>
//               <p>${businessConfig.rcpt_address}</p>
//               <p><strong> </strong> ${businessConfig.contactString}</p>
//               <p><strong>TAX INVOICE</strong></p>
//               <p><strong>TRN: </strong>104155043300003</p>
//             </div>
      
//             <!-- Info -->
//             <table class="info">
//               <tr>
//                 <td><strong>Invoice#</strong></td>
//                 <td>${invoiceNo}</td>
//               </tr>
//               <tr>
//                 <td><strong>Date</strong></td>
//                 <td>${date}</td>
//               </tr>
//               <tr>
//                 <td><strong>Customer</strong></td>
//                 <td>${customerName}</td>
//               </tr>
//               <tr>
//                 <td><strong>Contact#</strong></td>
//                 <td>${customerContact}</td>
//               </tr>
//               <tr>
//                 <td><strong>Customer TRN#</strong></td>
//                 <td>${customerTRN}</td>
//               </tr>
//             </table>
      
//             <!-- Items -->
//             <table class="items">
//               <thead>
//                 <tr>
//                   <th style="width:35%;">Item</th>
//                   <th style="width:15%;">Qty</th>
//                   <th style="width:20%;">Price</th>
//                   <th style="width:15%;">VAT 5%</th>
//                   <th style="width:25%;">Total</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 ${itemRows}
//               </tbody>
//             </table>

//             <!-- Totals -->
//             <table class="totals">
//               <tr>
//                 <td>Total</td>
//                 <td>${formattedSumOfTotal} AED</td>
//               </tr>
//               <tr>
//                 <td>Total VAT</td>
//                 <td>${formattedSumOfVat} AED</td>
//               </tr>
//               <tr>
//                 <td>Disc</td>
//                 <td>${formattedNewDiscount} AED</td>
//               </tr>
//               <tr>
//                 <td>Grand Total</td>
//                 <td>${finalGrandTotal} AED</td>
//               </tr>
//             </table>
//           </div>
//         </body>
//       </html>`;
//      }
//     else if (latestConfig.printType === "A4") {
//         // ... (A4 HTML template here)
//         invoiceHtml = `
//         <!DOCTYPE html>
//             <html lang="en">
//             <head>
//               <meta charset="UTF-8" />
//               <title>A4 Invoice</title>
//               <style>
//                 body {
//                   font-family: "Segoe UI", Arial, sans-serif;
//                   background: #f5f7fa;
//                   padding: 20px;
//                   color: #333;
//                 }
//                 .a4 {
//                   width: 210mm;
//                   min-height: 297mm;
//                   margin: auto;
//                   background: #fff;
//                   padding: 30px 35px;
//                   box-shadow: 0 4px 15px rgba(0,0,0,0.1);
//                   border-radius: 8px;
//                 }
//                 .invoice-header {
//                   text-align: center;
//                   border-bottom: 3px solid #007bff;
//                   padding-bottom: 15px;
//                   margin-bottom: 25px;
//                 }
//                 .invoice-header img {
//                   width: 100px;
//                   height: auto;
//                   margin-bottom: 10px;
//                 }
//                 .invoice-header h1 {
//                   font-size: 28px;
//                   color: #007bff;
//                   margin-bottom: 8px;
//                   text-transform: uppercase;
//                   letter-spacing: 1px;
//                 }
//                 .info-section {
//                   display: flex;
//                   justify-content: space-between;
//                   margin-bottom: 25px;
//                 }
//                 .info-block {
//                   font-size: 14px;
//                   line-height: 1.6;
//                 }
//                 .info-block strong {
//                   display: inline-block;
//                   min-width: 80px;
//                   color: #222;
//                 }
//                 .items-table {
//                   width: 100%;
//                   border-collapse: collapse;
//                   margin-bottom: 20px;
//                   font-size: 14px;
//                 }
//                 .items-table thead {
//                   background: #007bff;
//                   color: #fff;
//                 }
//                 .items-table th {
//                   padding: 14px 12px;
//                   text-align: left;
//                 }
//                 .items-table td {
//                   border: 1px solid #ddd;
//                   padding: 12px 10px;
//                   text-align: left;
//                 }
//                 .items-table tr:nth-child(even) {
//                   background: #f9f9f9;
//                 }
//                 .items-table tfoot td {
//                   font-weight: bold;
//                   background: #f1f5ff;
//                   border-top: 2px solid #007bff;
//                 }
//                 .items-table tfoot tr td:last-child {
//                   text-align: right;
//                   color: #007bff;
//                 }
//                 .invoice-footer {
//                   text-align: center;
//                   margin-top: 40px;
//                   font-size: 13px;
//                   color: #444;
//                 }
//                 .invoice-footer strong {
//                   display: block;
//                   margin-bottom: 6px;
//                   color: #000;
//                 }
//                 @media print {
//                     .a4 {
//                         box-shadow: none;
//                     }
//                 }
//               </style>
//             </head>
//             <body>
//               <div class="a4">
//                 <div class="invoice-header">
//                   <h1>${(businessConfig as any).rcpt_name}</h1>
//                   <p>${(businessConfig as any).rcpt_address}</p>
//                   <p>${(businessConfig as any).contactString}</p>
//                   <p><strong>TAX INVOICE</strong></p>
//                   <p><strong>TRN:</strong>104155043300003</p>
//                 </div>
//                 <div class="info-section">
//                   <div class="info-block">
//                     <p><strong>Customer</strong> ${customerName}</p>
//                     <p><strong>Contact#</strong> ${customerContact}</p>
//                     <p><strong>Customer TRN</strong> ${customerTRN}</p>
//                   </div>
//                   <div class="info-block">
//                     <p><strong>Date</strong>${date}</p>
//                     <p><strong>Invoice#</strong> ${invoiceNo}</p>
//                   </div>
//                 </div>
//                 <table class="items-table">
//                   <thead>
//                     <tr>
//                       <th style="width:40%;">Product</th>
//                       <th style="width:15%;">Quantity</th>
//                       <th style="width:15%;">Price</th>
//                       <th style="width:15%;">VAT 5%</th>
//                       <th style="width:15%;">Total</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     ${itemRows}
//                   </tbody>
//                     <tr>
//                       <td colspan="4">Total</td>
//                       <td>${formattedSumOfTotal} AED</td>
//                     </tr>
//                   <tr>
//                       <td colspan="4">Total VAT</td>
//                       <td>${formattedSumOfVat} AED</td>
//                     </tr>
//                   <tr>
//                       <td colspan="4">Disc</td>
//                       <td>${formattedNewDiscount} AED</td>
//                     </tr>
//                   <tfoot>
//                     <tr>
//                       <td colspan="4">Grand Total</td>
//                       <td>${finalGrandTotal} AED</td>
//                     </tr>
//                   </tfoot>
//                 </table>
//                 <div class="invoice-footer">
//                 </div>
//               </div>
//             </body>
//             </html>
// `;
//     }

//     else {
//       res.status(400).send({ message: "Invalid print type. Please use 'thermal' or 'A4'." });
//       return;
//     }

//     await TempProducts.deleteMany({});

//     res.status(200).send(invoiceHtml);
//   } catch (error) {
//     console.error("Error printing sales data:", error);
//     res.status(500).send({ message: "An unexpected error occurred." });
//   }
// };

export const printSalesData = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
     let invoiceNo = invoiceNoNew;
     console.log(invoiceNo);

    if (!invoiceNo) {
      res.status(400).send({ message: "Please provide the Invoice Number!" });
      return;
    }

    const latestConfig = await (PrinterConfigurationModel as any).findOne({})
      .sort({ createdAt: -1 })
      .lean();

    const getvatstatus = await (TempProducts as any).findOne({}).sort({ createdAt: -1 }).lean();

    if (!latestConfig?.printType) {
      res.status(404).json({ message: "Print Type not found!" });
      return;
    }

    const getSalesData = await (SalesDetail as any).findOne({ invoiceNo: invoiceNo })
      .populate("products.productId")
      .lean();

    if (!getSalesData) {
      res.status(404).send({ message: `Invoice with number ${invoiceNo} not found!` });
      return;
    }

    const customerName = getSalesData.customerName || "";
    const customerContact = getSalesData.customerContact || "";
    const customerTRN = getSalesData.customerTRN || "Nil";
    const date = new Date(getSalesData.date).toLocaleDateString();
    const grandTotalFromDB = getSalesData.grandTotal || 0; // Use DB value as fallback
    const realtime = getSalesData.createdAt || 0;
    const theTime = formatDateTime(realtime);
    console.log(theTime);

    let itemRows = "";
    let sumOfTotal = 0; // Summary Total (Base Price * Qty)
    let sumOfVat = 0;   // Summary VAT (Total VAT amount)
    let newDiscount = 0; // Discount amount for the 'Disc' summary line
    let totalDiscountSum = 0; // Total sum of all discounts (for accurate final calculation)

    // Calculate unformatted sums needed for final totals
    sumOfTotal = (getSalesData.products || []).reduce(
      (acc: number, item: any) => acc + (Number(item.rate || 0) * Number(item.qty || 0)),
      0
    );

    sumOfVat = (getSalesData.products || []).reduce(
      (acc: number, item: any) => acc + Number(item.VAT || 0),
      0
    );
    
    totalDiscountSum = (getSalesData.products || []).reduce(
      (acc: number, item: any) => acc + Number(item.discount || 0),
      0
    );


    // --- Conditional Item Row Mapping ---
    if (getvatstatus?.VATstatus === "withoutVAT") {
      itemRows = (getSalesData.products || [])
        .map((item: any) => {
          const itemRate = formatCurrency(item.rate);
          const vatAmount = formatCurrency(item.VAT);

          // Rule: Line Item Total = (Price * Qty) + VAT (NO DISCOUNT)
          const itemBasePrice = Number(item.rate) * Number(item.qty);
          const itemNetTotalValue = itemBasePrice + Number(item.VAT);
          const itemNetTotal = formatCurrency(itemNetTotalValue); 
          
          return `
            <tr>
              <td>${item.productName}</td>
              <td style="text-align:right;">${item.qty}</td>
              <td style="text-align:right;">${itemRate}</td>
              <td style="text-align:right;">${vatAmount}</td>
              <td style="text-align:right;">${itemNetTotal}</td>
            </tr>
          `;
        })
        .join("");

      // Display Discount: Use the simple total discount sum
      newDiscount = totalDiscountSum + sumOfVat; 
      
    } else { // WITH VAT (Standard Scenario from Image)
      itemRows = (getSalesData.products || [])
        .map((item: any) => {
          const itemRate = formatCurrency(item.rate);
          const vatAmount = formatCurrency(item.VAT);
          
          // Rule: Line Item Total = VAT + (Price * Qty) - NO DISCOUNT
          const itemBasePrice = Number(item.rate) * Number(item.qty);
          const itemNetTotalValue = itemBasePrice + Number(item.VAT);
          const itemNetTotal = formatCurrency(itemNetTotalValue); 
          // const qty = Number(item.qty) || 0;
          // const unitPrice = Number(item.rate) || 0;
          // const discount = Number(item.discount) || 0;
          // const VATtax = Number(item.VAT) || 0;

          // // --- withVAT logic replicated exactly ---
          // let withRate = unitPrice;

          // // Remove VAT portion per unit
          // withRate -= VATtax / qty;

          // // Base total excluding VAT & discount
          // const itemBasePrice = withRate * qty;  

          // // Apply discount (like backend)
          // const total = roundToTwoDecimals(itemBasePrice - discount);

          // // Another discount tracking (optional)
          // const anotherDiscount = discount;

          // // Net total = original rate * qty (same as backend baseTotalExclDisc)
          // const itemNetTotalValue = roundToTwoDecimals(unitPrice * qty); 

          // // Preserve your display variable names
          // const itemRate = formatCurrency(withRate);   
          // const vatAmount = formatCurrency(VATtax);   
          // const itemNetTotal = formatCurrency(itemNetTotalValue); 

          return `
            <tr>
              <td>${item.productName}</td>
              <td style="text-align:right;">${item.qty}</td>
              <td style="text-align:right;">${itemRate}</td>
              <td style="text-align:right;">${vatAmount}</td>
              <td style="text-align:right;">${itemNetTotal}</td>
            </tr>
          `;
        })
        .join("");

      // Display Discount: Use the simple total discount
      newDiscount = totalDiscountSum; 
    }

    // --- Final Grand Total Calculation ---
    // Rule: Grand Total = Total (Base Price Sum) + Total VAT - Total Discount
    const calculatedGrandTotal = Number(sumOfTotal) + Number(sumOfVat) - Number(newDiscount);
    
    // --- Final Formatting of Totals for HTML Injection ---
    // These variables will be injected into the HTML templates
    const finalGrandTotal = formatCurrency(calculatedGrandTotal);
    const formattedSumOfTotal = formatCurrency(sumOfTotal);
    const formattedSumOfVat = formatCurrency(sumOfVat);
    const formattedNewDiscount = formatCurrency(newDiscount);


    let invoiceHtml = "";

    if (latestConfig.printType === "thermal") {
      invoiceHtml = 
      `<!DOCTYPE html>
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
              width: 65mm;
              min-height: 110mm;
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
              padding: 3px 4px; /* left-right spacing add kiya */
              white-space: nowrap; /* text break nahi hoga */
            }
      
            .items td {
              padding: 3px 4px;
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
              <h3>${businessConfig.rcpt_name}</h3>
              <p>${businessConfig.rcpt_address}</p>
              <p><strong> </strong> ${businessConfig.contactString}</p>
              <p><strong>TAX INVOICE</strong></p>
              <p><strong>TRN: </strong>104155043300003</p>
            </div>
      
            <!-- Info -->
            <table class="info">
              <tr>
                <td><strong>Invoice#</strong></td>
                <td>${invoiceNo}</td>
              </tr>
              <tr>
                <td><strong>Date</strong></td>
                <td>${date}</td>
              </tr>
              <tr>
                <td><strong>Customer</strong></td>
                <td>${customerName}</td>
              </tr>
              <tr>
                <td><strong>Contact#</strong></td>
                <td>${customerContact}</td>
              </tr>
              <tr>
                <td><strong>Customer TRN#</strong></td>
                <td>${customerTRN}</td>
              </tr>
            </table>
      
            <!-- Items -->
            <table class="items">
              <thead>
                <tr>
                  <th style="width:35%;">Item</th>
                  <th style="width:15%;">Qty</th>
                  <th style="width:20%;">Price</th>
                  <th style="width:15%;">VAT 5%</th>
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
                <td>Total</td>
                <td>${formattedSumOfTotal} AED</td>
              </tr>
              <tr>
                <td>Total VAT</td>
                <td>${formattedSumOfVat} AED</td>
              </tr>
              <tr>
                <td>Disc</td>
                <td>${formattedNewDiscount} AED</td>
              </tr>
              <tr>
                <td>Grand Total</td>
                <td>${finalGrandTotal} AED</td>
              </tr>
            </table>
          </div>
        </body>
      </html>`;
     }
    else if (latestConfig.printType === "A4") {
        // ... (A4 HTML template here)
        invoiceHtml = `
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
                  <h1>${(businessConfig as any).rcpt_name}</h1>
                  <p>${(businessConfig as any).rcpt_address}</p>
                  <p>${(businessConfig as any).contactString}</p>
                  <p><strong>TAX INVOICE</strong></p>
                  <p><strong>TRN:</strong>104155043300003</p>
                </div>
                <div class="info-section">
                  <div class="info-block">
                    <p><strong>Customer</strong> ${customerName}</p>
                    <p><strong>Contact#</strong> ${customerContact}</p>
                    <p><strong>Customer TRN</strong> ${customerTRN}</p>
                  </div>
                  <div class="info-block">
                    <p><strong>Date</strong>${date}</p>
                    <p><strong>Invoice#</strong> ${invoiceNo}</p>
                  </div>
                </div>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width:40%;">Product</th>
                      <th style="width:15%;">Quantity</th>
                      <th style="width:15%;">Price</th>
                      <th style="width:15%;">VAT 5%</th>
                      <th style="width:15%;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                    <tr>
                      <td colspan="4">Total</td>
                      <td>${formattedSumOfTotal} AED</td>
                    </tr>
                  <tr>
                      <td colspan="4">Total VAT</td>
                      <td>${formattedSumOfVat} AED</td>
                    </tr>
                  <tr>
                      <td colspan="4">Disc</td>
                      <td>${formattedNewDiscount} AED</td>
                    </tr>
                  <tfoot>
                    <tr>
                      <td colspan="4">Grand Total</td>
                      <td>${finalGrandTotal} AED</td>
                    </tr>
                  </tfoot>
                </table>
                <div class="invoice-footer">
                </div>
              </div>
            </body>
            </html>
`;
    }

    else {
      res.status(400).send({ message: "Invalid print type. Please use 'thermal' or 'A4'." });
      return;
    }

    await TempProducts.deleteMany({});

    res.status(200).send(invoiceHtml);
  } catch (error) {
    console.error("Error printing sales data:", error);
    res.status(500).send({ message: "An unexpected error occurred." });
  }
};
export const getSalesData = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    const limit: number = req.query.limit ? parseInt(req.query.limit as string, 10) : 10000000;
    const page: number = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const offset: number = (page - 1) * limit;

    const printType: string = req.query.printType as string;

    // --- Date Parsing Fix ---
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (req.query.fromDate) {
      const from = new Date(req.query.fromDate as string);
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0); // start of day
        fromDate = from;
      }
    }

    if (req.query.toDate) {
      const to = new Date(req.query.toDate as string);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999); // end of day
        toDate = to;
      }
    }

    // --- Build Query ---
    const query: any = { status: "Y" }; // enforce active invoices only

    // Date filter
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }

    // Search filter (merged from searchSalesData)
    const search = req.query.search as string;
    if (search) {
      const numericSearch = Number(search);

      query.$or = [
        !isNaN(numericSearch) ? { invoiceNo: numericSearch } : null,
        { customerName: { $regex: new RegExp(search, "i") } },
        !isNaN(numericSearch) ? { grandTotal: numericSearch } : null,
        { "products.productName": { $regex: new RegExp(search, "i") } },
      ].filter(Boolean);
    }

    // --- Fetch ---
    const getAllInvoices = await SalesDetail.find(query)
      .populate("products.productId")
      .sort({ invoiceNo: 1 })
      .lean()
      .skip(offset)
      .limit(limit);

    if (!getAllInvoices || getAllInvoices.length === 0) {
      res.status(404).send();
      return;
    }

    // --- Data Transformation ---
    const transformedInvoices = getAllInvoices.map(invoice => {
      const products = (invoice.products || [])
        .map(product => {
          if (!product) return null;
          const productId = (product.productId as any)?._id || product.productId;

          return {
            productId,
            productName: product.productName || (product.productId as any)?.name || "",
            qty: product.qty,
            rate: product.rate,
            discount: product.discount,
            VAT: product.VAT,
            total: product.total,
            netTotal: product.netTotal
          };
        })
        .filter(product => product !== null);

      const sumOfVat = Number(products.reduce((sum, product) => sum + Number(product.VAT || 0), 0).toFixed(2));
      const sumOfTotal = Number(products.reduce((sum, product) => sum + Number(product.total || 0), 0).toFixed(2));

      return {
        customerName: invoice.customerName,
        customerContact: invoice.customerContact,
        customerTRN: invoice.customerTRN,
        products,
        grandTotal: invoice.grandTotal,
        sumOfVat,
        sumOfTotal,
        invoiceNo: invoice.invoiceNo,
        invoice: invoice.invoice,
        date: invoice.date,
        status: invoice.status,
        _id: invoice._id,
        createdAt: invoice.createdAt
      };
    });

    // --- Print Mode (HTML Response) ---
    if (printType === 'thermal' || printType === 'A4') {
      res.setHeader('Content-Type', 'text/html');

      const htmlInvoices = transformedInvoices.map(invoice => {
        const {
          customerName = "",
          customerContact = "",
          customerTRN = "",
          invoiceNo = "",
          date = "",
          grandTotal = 0,
          products = [],
          sumOfVat = 0,
          sumOfTotal = 0
        } = invoice;

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
        padding: 3px 4px; /* left-right spacing add kiya */
        white-space: nowrap; /* text break nahi hoga */
      }
 
      .items td {
        padding: 3px 4px;
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
        <h3>${businessConfig.rcpt_name}</h3>
        <p>${businessConfig.rcpt_address}</p>
        <p><strong> </strong> ${businessConfig.contactString}</p>
        <p><strong>TAX INVOICE</strong></p>
        <p><strong>TRN: </strong>104155043300003</p>
      </div>
 
      <!-- Info -->
      <table class="info">
        <tr>
          <td><strong>Invoice#</strong></td>
          <td>${invoiceNo}</td>
        </tr>
        <tr>
          <td><strong>Date</strong></td>
          <td>${date.toLocaleString().slice(0, 9)}</td>
        </tr>
        <tr>
          <td><strong>Customer</strong></td>
          <td>${customerName}</td>
        </tr>
        <tr>
          <td><strong>Contact#</strong></td>
          <td>${customerContact}</td>
        </tr>
        <tr>
            <td><strong>Customer TRN#</strong></td>
            <td>${customerTRN}</td>
              </tr>
      </table>
 
      <!-- Items -->
      <table class="items">
        <thead>
          <tr>
            <th style="width:35%;">Item</th>
            <th style="width:15%;">Qty</th>
            <th style="width:20%;">Price</th>
            <th style="width:15%;">VAT 5%</th>
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
          <td>Total</td>
          <td>${sumOfTotal} AED</td>
        </tr>
        <tr>
          <td>Total VAT</td>
          <td>${sumOfVat} AED</td>
        </tr>
        <tr>
          <td>Grand Total</td>
          <td>${grandTotal} AED</td>
        </tr>
      </table>
 
     
   
    </div>
  </body>
          </html>`;
        }
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
                  <h1>${(businessConfig as any).rcpt_name}</h1>
                  <p>${(businessConfig as any).rcpt_address}</p>
                  <p>${(businessConfig as any).contactString}</p>
                  <p><strong>TAX INVOICE</strong></p>
                  <p><strong>TRN:</strong>104155043300003</p>
                </div>
                <div class="info-section">
                  <div class="info-block">
                    <p><strong>Customer</strong> ${customerName}</p>
                    <p><strong>Contact#</strong> ${customerContact}</p>
                    <p><strong>Customer TRN</strong> ${customerTRN}</p>
                  </div>
                  <div class="info-block">
                    <p><strong>Date</strong> ${date.toLocaleString().slice(0, 9)}</p>
                    <p><strong>Invoice#</strong> ${invoiceNo}</p>
                  </div>
                </div>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width:40%;">Product</th>
                      <th style="width:15%;">Quantity</th>
                      <th style="width:15%;">Price</th>
                      <th style="width:15%;">VAT 5%</th>
                      <th style="width:15%;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                  <tr>
                      <td colspan="4">Total</td>
                      <td>${sumOfTotal} AED</td>
                    </tr>
                  <tr>
                      <td colspan="4">Total VAT</td>
                      <td>${sumOfVat} AED</td>
                    </tr>
                  <tfoot>
                    <tr>
                      <td colspan="4">Grand Total</td>
                      <td>${grandTotal} AED</td>
                    </tr>
                  </tfoot>
                </table>
                <div class="invoice-footer">
                </div>
              </div>
            </body>
            </html>
          `;
        }

        return htmlTemplate;
      });

      res.status(200).send(htmlInvoices.join("<div style='page-break-after:always;'></div>"));
      return; 
    }

    res.status(200).json(transformedInvoices);

  } catch (error) {
    handleError(res, error);
  }
};


export const searchSalesData = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    const limit: number = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 10000000;
    const page: number = req.query.page
      ? parseInt(req.query.page as string, 10)
      : 1;
    const offset: number = (page - 1) * limit;

    // ✅ Always enforce status = 'Y'
    const query: any = { status: "Y" };
    const search = req.query.search as string;

    if (search) {
      const numericSearch = Number(search);

      query.$or = [
        // Invoice number (if numeric)
        !isNaN(numericSearch) ? { invoiceNo: numericSearch } : null,

        // Customer name (case-insensitive)
        { customerName: { $regex: new RegExp(search, "i") } },

        // Grand total (if numeric)
        !isNaN(numericSearch) ? { grandTotal: numericSearch } : null,

        // Product name (nested search)
        { "products.productName": { $regex: new RegExp(search, "i") } },
      ].filter(Boolean); // remove nulls
    }

    const salesData = await SalesDetail.find(query)
      .populate("products.productId")
      .sort({ createdAt: -1 })
      .lean()
      .skip(offset)
      .limit(limit);

    if (!salesData || salesData.length === 0) {
      res
        .status(404)
        .send();
      return;
    }

    // Format response
    const formatted = salesData.map((invoice) => ({
      success: true,
      message: "Sale retrieved successfully",
      customerName: invoice.customerName || "",
      customerContact: invoice.customerContact || "",
      customerTRN: invoice.customerTRN || "",
      products: (invoice.products || []).map((p: any) => ({
        productId: p.productId?._id || p.productId,
        productName: p.productName || p.productId?.name || "",
        qty: p.qty,
        rate: p.rate,
        discount: p.discount,
        VAT: p.VAT,
        total: p.total,
        netTotal: p.netTotal,
        _id: p._id,
      })),
      grandTotal: invoice.grandTotal || 0,
      invoiceNo: invoice.invoiceNo,
      invoice: invoice.invoice,
      date: invoice.date,
      status: invoice.status,
      _id: invoice._id,
      createdAt: invoice.createdAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error searching sales data:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred." });
  }
};


export const getSalesDataById = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    // --- FIX 1: Assign invoiceNo from URL parameter (Assuming this controller is mounted with an ID param) ---
    // Note: If this controller is not mounted with an ID param, you MUST get it from the body/query instead.
    const invoiceNo = req.params.id; 
    console.log(invoiceNo);

    if (!invoiceNo) {
      res.status(400).send({ message: "Please provide the Invoice Number!" });
      return;
    }

    const latestConfig = await (PrinterConfigurationModel as any).findOne({})
      .sort({ createdAt: -1 })
      .lean();

//     const getvatstatus = await (TempProducts as any).findOne({}).sort({ createdAt: -1 }).lean();

    if (!latestConfig?.printType) {
      res.status(404).json({ message: "Print Type not found!" });
      return;
    }

    const getSalesData = await (SalesDetail as any).findOne({ invoiceNo: invoiceNo })
      .populate("products.productId")
      .lean();

    const getvatstatus = getSalesData ? getSalesData.vatStatus : undefined; 
    console.log("the real vat status ", getvatstatus);
    if (!getSalesData) {
      res.status(404).send({ message: `Invoice with number ${invoiceNo} not found!` });
      return;
    }

    const choiceVAT = "withoutVAT";
    let calculatedGrandTotal = 0; 
    let finalDiscountForDisplay = 0;

    const customerName = getSalesData.customerName || "";
    const customerContact = getSalesData.customerContact || "";
    const customerTRN = getSalesData.customerTRN || "Nil";
    const date = new Date(getSalesData.date).toLocaleDateString();
    const grandTotalFromDB = getSalesData.grandTotal || 0; // Use DB value as fallback
    const realtime = getSalesData.createdAt || 0;
    const theTime = formatDateTime(realtime);
    console.log(theTime);

    // Initialize accumulators (using temporary variables for calculation consistency)
    let itemRows = "";
    let sumOfTotal = 0;     // Summary Total (Base Price * Qty)
    let sumOfVat = 0;       // Summary VAT (Total VAT amount)
    let totalDiscountSum = 0; // Sum of all item discounts (used for accurate final calculation)
    
    // Calculate unformatted sums needed for final totals BEFORE the conditional logic begins
    sumOfTotal = (getSalesData.products || []).reduce(
      (acc: number, item: any) => acc + (Number(item.rate || 0) * Number(item.qty || 0)),
      0
    );

    sumOfVat = (getSalesData.products || []).reduce(
      (acc: number, item: any) => acc + Number(item.VAT || 0),
      0
    );
    
    totalDiscountSum = (getSalesData.products || []).reduce(
      (acc: number, item: any) => acc + Number(item.discount || 0),
      0
    );
    
    let newDiscount: number; // The specific discount amount to display on the 'Disc' line

    // --- Conditional Mapping and Calculations (VAT Status Logic) ---
if (getvatstatus === "withoutVAT") {
  itemRows = (getSalesData.products || [])
    .map((item: any) => {
      const itemRate = formatCurrency(item.rate);
      const vatAmount = formatCurrency(item.VAT);

      const itemBasePrice = Number(item.rate) * Number(item.qty);
      const itemNetTotalValue = itemBasePrice + Number(item.VAT);

      const itemNetTotal = formatCurrency(itemNetTotalValue);

      return `
        <tr>
          <td>${item.productName}</td>
          <td style="text-align:right;">${item.qty}</td>
          <td style="text-align:right;">${itemRate}</td>
          <td style="text-align:right;">${vatAmount}</td>
          <td style="text-align:right;">${itemNetTotal}</td>
        </tr>
      `;
    })
    .join("");

  newDiscount = totalDiscountSum + sumOfVat;  
  calculatedGrandTotal = Number(sumOfTotal) - Number(totalDiscountSum);

} else {
  itemRows = (getSalesData.products || [])
    .map((item: any) => {
      const itemRate = formatCurrency(item.rate);
      const vatAmount = formatCurrency(item.VAT);

      const itemBasePrice = Number(item.rate) * Number(item.qty);
      const itemNetTotalValue = itemBasePrice + Number(item.VAT);
      const itemNetTotal = formatCurrency(itemNetTotalValue);

      return `
        <tr>
          <td>${item.productName}</td>
          <td style="text-align:right;">${item.qty}</td>
          <td style="text-align:right;">${itemRate}</td>
          <td style="text-align:right;">${vatAmount}</td>
          <td style="text-align:right;">${itemNetTotal}</td>
        </tr>
      `;
    })
    .join("");

  newDiscount = totalDiscountSum;
  calculatedGrandTotal = Number(sumOfTotal) + Number(sumOfVat) - Number(totalDiscountSum);
}

// --- Final formatting ---
const finalGrandTotal = formatCurrency(calculatedGrandTotal);
const formattedSumOfTotal = formatCurrency(sumOfTotal);
const formattedSumOfVat = formatCurrency(sumOfVat);
const formattedNewDiscount = formatCurrency(newDiscount);


    
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
              width: 65mm;
              min-height: 110mm;
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
              padding: 3px 4px; /* left-right spacing add kiya */
              white-space: nowrap; /* text break nahi hoga */
            }
      
            .items td {
              padding: 3px 4px;
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
                size: 65mm auto;
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
              <h3>${businessConfig.rcpt_name}</h3>
              <p>${businessConfig.rcpt_address}</p>
              <p><strong> </strong> ${businessConfig.contactString}</p>
              <p><strong>TAX INVOICE</strong></p>
              <p><strong>TRN: </strong>104155043300003</p>
            </div>
      
            <!-- Info -->
            <table class="info">
              <tr>
                <td><strong>Invoice#</strong></td>
                <td>${invoiceNo}</td>
              </tr>
              <tr>
                <td><strong>Date</strong></td>
                <td>${date}</td>
              </tr>
              <tr>
                <td><strong>Customer</strong></td>
                <td>${customerName}</td>
              </tr>
              <tr>
                <td><strong>Contact#</strong></td>
                <td>${customerContact}</td>
              </tr>
              <tr>
                <td><strong>Customer TRN#</strong></td>
                <td>${customerTRN}</td>
              </tr>
            </table>

            <!-- Items -->
            <table class="items">
              <thead>
                <tr>
                  <th style="width:35%;">Item</th>
                  <th style="width:15%;">Qty</th>
                  <th style="width:20%;">Price</th>
                  <th style="width:15%;">VAT 5%</th>
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
                <td>Total</td>
                <td>${formattedSumOfTotal} AED</td>
              </tr>
              <tr>
                <td>Total VAT</td>
                <td>${formattedSumOfVat} AED</td>
              </tr>
              <tr>
                <td>Disc</td>
                <td>${formattedNewDiscount} AED</td>
              </tr>
              <tr>
                <td>Grand Total</td>
                <td>${finalGrandTotal} AED</td>
              </tr>
            </table>
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
                  <h1>${(businessConfig as any).rcpt_name}</h1>
                  <p>${(businessConfig as any).rcpt_address}</p>
                  <p>${(businessConfig as any).contactString}</p>
                  <p><strong>TAX INVOICE</strong></p>
                  <p><strong>TRN:</strong>104155043300003</p>
                </div>
                <div class="info-section">
                  <div class="info-block">
                    <p><strong>Customer</strong> ${customerName}</p>
                    <p><strong>Contact#</strong> ${customerContact}</p>
                    <p><strong>Customer TRN</strong> ${customerTRN}</p>
                  </div>
                  <div class="info-block">
                    <p><strong>Date</strong> ${date}</p>
                    <p><strong>Invoice#</strong> ${invoiceNo}</p>
                  </div>
                </div>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width:40%;">Product</th>
                      <th style="width:15%;">Quantity</th>
                      <th style="width:15%;">Price</th>
                      <th style="width:15%;">VAT 5%</th>
                      <th style="width:15%;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                  <tr>
                      <td colspan="4">Total</td>
                      <td>${formattedSumOfTotal} AED</td>
                    </tr>
                  <tr>
                      <td colspan="4">Total VAT</td>
                      <td>${formattedSumOfVat} AED</td>
                    </tr>
                  <tr>
                      <td colspan="4">Disc</td>
                      <td>${formattedNewDiscount} AED</td>
                    </tr>
                  <tfoot>
                    <tr>
                      <td colspan="4">Grand Total</td>
                      <td>${finalGrandTotal} AED</td>
                    </tr>
                  </tfoot>
                </table>
                <div class="invoice-footer">
                </div>
              </div>
            </body>
            </html>`;
    }

    else {
      res.status(400).send({ message: "Invalid print type. Please use 'thermal' or 'A4'." });
      return;
    }

    await TempProducts.deleteMany({});

    res.status(200).send(invoiceHtml);
  } catch (error) {
    console.error("Error printing sales data:", error);
    res.status(500).send({ message: "An unexpected error occurred." });
  }
};


export const deleteFromSaleDetails = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const deleteProduct = await (SalesDetail as any).deleteMany({}); 

    res.status(200).json({
      success: true,
      message: "Sales data cleared successfully",
      ...deleteProduct, 
    });
  } catch (error) {
    handleError(res, error);
  }
};