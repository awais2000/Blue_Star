// NOTE: Make sure the following utility function is accessible (either defined above the controller 
// or imported from a file like '../utils/formatUtils').

const formatCurrency = (value: number | string | undefined | null): string => {
    const num = Number(value) || 0;
    const fixedNum = num.toFixed(2);
    return parseFloat(fixedNum).toString();
};

export const printSalesData = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    // --- FIX 1: Use req.params.id and remove reliance on undefined global 'invoiceNoNew' ---
    const invoiceNo = req.params.id; 
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
    const date = new Date(getSalesData.date).toLocaleDateString();
    const grandTotalFromDB = getSalesData.grandTotal || 0; // Use DB value as fallback

    let itemRows = "";
    let sumOfTotal = 0; // Summary Total (Base Price * Qty)
    let sumOfVat = 0;   // Summary VAT (Total VAT amount)
    let newDiscount = 0; // Discount amount for the 'Disc' summary line
    let totalDiscountSum = 0; // Total sum of all discounts (for accurate final calculation)

    // --- Calculate Totals First (Consolidated) ---
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
      newDiscount = totalDiscountSum; 
      
    } else { // WITH VAT (Standard Scenario from Image)
      itemRows = (getSalesData.products || [])
        .map((item: any) => {
          const itemRate = formatCurrency(item.rate);
          const vatAmount = formatCurrency(item.VAT);
          
          // Rule: Line Item Total = VAT + (Price * Qty) - NO DISCOUNT
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

    // --- HTML TEMPLATE START ---
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
                        <div class="header">
              <h3>${businessConfig.rcpt_name}</h3>
              <p>${businessConfig.rcpt_address}</p>
              <p><strong> </strong> ${businessConfig.contactString}</p>
              <p><strong>TAX INVOICE</strong></p>
              <p><strong>TRN: </strong>104155043300003</p>
            </div>
      
                        <table class="info">
              <tr>
                <td><strong>Invoice#</strong></td>
                <td>${invoiceNo}</td>
                <td><strong>Date</strong></td>
                <td>${date.toLocaleString().slice(0, 9)}</td>
              </tr>
              <tr>
                <td><strong>Customer</strong></td>
                <td>${customerName}</td>
                <td><strong>Contact#</strong></td>
                <td>${customerContact}</td>
              </tr>
            </table>
      
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
                      <td>${formattedSumOfTotal} AED</td>
                    </tr>
                  <tr>
                      <td colspan="4">Total VAT</td>
                      <td>${formattedSumOfVat} AED</td>
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