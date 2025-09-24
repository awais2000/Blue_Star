"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSalesData = exports.addPrintConfig = void 0;
// const logoBase64 = fs.readFileSync("./uploads/bluestarlogo.jpg", "base64");
const errorHandler_1 = require("../utils/errorHandler");
const printerConfiguration_1 = __importDefault(require("../models/printerConfiguration"));
const SalesDetail_1 = __importDefault(require("../models/SalesDetail"));
const addPrintConfig = async (req, res) => {
    try {
        const id = req.params.id;
        const { printType } = req.body;
        if (!printType) {
            res.status(400).json({ message: "Bad Request: printType is required" });
            return;
        }
        let config;
        if (!id) {
            config = await printerConfiguration_1.default.create({ printType });
        }
        else {
            config = await printerConfiguration_1.default.findByIdAndUpdate(id, { $set: { printType } }, { new: true, upsert: true });
        }
        res.status(200).json({
            success: true,
            message: !id ? "Print configuration created successfully" : "Print configuration updated successfully",
            ...config.toObject(),
        });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
};
exports.addPrintConfig = addPrintConfig;
const businessConfig = {
    rcpt_name: 'Blue Star Electronics Repair L.L.C',
    rcpt_address: 'Baniyas East 9 Near Shahab Baniyas Cafeteria',
    contactString: '+971554831700',
};
const printSalesData = async (req, res) => {
    try {
        const { invoiceNo } = req.body;
        const latestConfig = await printerConfiguration_1.default.findOne({})
            .sort({ createdAt: -1 })
            .lean();
        if (!latestConfig?.printType) {
            res.status(404).json({ message: "Print Type not found!" });
            return;
        }
        const getSalesData = await SalesDetail_1.default.findOne({ invoiceNo })
            .populate("items.productId")
            .lean();
        if (!getSalesData) {
            res.status(404).json({ message: "Invoice not found!" });
            return;
        }
        const customerName = getSalesData.customerName || "";
        const customerContact = getSalesData.customerContact || "";
        const date = new Date(getSalesData.date).toLocaleDateString();
        const total = getSalesData.total || 0;
        const discount = getSalesData.discount || 0;
        const VAT = getSalesData.VAT || 0;
        const netTotal = getSalesData.netTotal || 0;
        const itemRows = (getSalesData.items || [])
            .map((item) => {
            const product = item.productId || {};
            const name = product.productName || "";
            const qty = item.qty || 0;
            const price = item.unitPrice || 0;
            return `
          <tr>
            <td>${name}</td>
            <td style="text-align:right;">${qty}</td>
            <td style="text-align:right;">${price}</td>
          </tr>
        `;
        })
            .join("");
        let invoiceHtml = "";
        if (latestConfig.printType === "thermal") {
            invoiceHtml = `
  <!DOCTYPE html>
  <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Thermal Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .thermal {
            width: 80mm;
            font-size: 12px;
            padding: 10px;
            margin: 10px auto;
            border: 1px solid #000;
            box-sizing: border-box;
          }
          .thermal table { width: 100%; font-size: 11px; border-collapse: collapse; }
          .thermal th, .thermal td { padding: 2px 0; }
          .thermal thead tr { border-bottom: 1px dashed #000; }
          .thermal tfoot tr { border-top: 1px dashed #000; }
          @media print { @page { size: 80mm auto; margin: 0; } }
        </style>
      </head>
      <body>
        <div class="thermal">
          <img src="/uploads/bluestarlogo.jpg" alt="Bluestar Logo" style="max-width:50px; display:block; margin:0 auto;" />
          <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px;">
            <h3>${businessConfig.rcpt_name}</h3>
            <p style="font-size: 10px;"><strong>Address:</strong> ${businessConfig.rcpt_address}</p>
            <p><strong>Ph:</strong> ${businessConfig.contactString}</p>
          </div>
          <table>
            <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
            <tr><td><strong>Customer:</strong></td><td>${customerName}</td></tr>
            <tr><td><strong>Contact:</strong></td><td>${customerContact}</td></tr>
          </table>
          <table style="margin-top:10px; border-top:1px dashed #000;">
            <thead>
              <tr>
                <th style="text-align:left;">Item</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          <table style="margin-top:10px;">
            <tr><td><strong>Total:</strong></td><td style="text-align:right;">${total}</td></tr>
            <tr><td><strong>Discount:</strong></td><td style="text-align:right;">${discount}</td></tr>
            <tr><td><strong>VAT:</strong></td><td style="text-align:right;">${VAT}</td></tr>
            <tr><td><strong>Net Total:</strong></td><td style="text-align:right;">${netTotal}</td></tr>
          </table>
          <div style="text-align:center; margin-top:10px; font-size:10px;">
            <p><strong>Software Developed with love by</strong></p>
            <h6><a href="https://technicmentors.com/" target="_blank">Friendz&Co</a></h6>
          </div>
        </div>
      </body>
      </html>`;
        }
        else if (latestConfig.printType === "A4") {
            invoiceHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>A4 Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .a4 {
            width: 210mm;
            min-height: 297mm;
            padding: 20px;
            border: 1px solid #000;
            margin: 0 auto;
          }
          .a4 table { width: 100%; border-collapse: collapse; }
          .a4 th, .a4 td { border: 1px solid #000; padding: 6px; }
          @media print { @page { size: A4; margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="a4">
          <div style="text-align: center;">
            <h2>${businessConfig.rcpt_name}</h2>
            <p>${businessConfig.rcpt_address}</p>
            <p>${businessConfig.contactString}</p>
          </div>
          <table style="margin-top:20px;">
            <tr><td><strong>Customer:</strong></td><td>${customerName}</td></tr>
            <tr><td><strong>Contact:</strong></td><td>${customerContact}</td></tr>
            <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
          </table>
          <table style="margin-top:20px;">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total:</strong></td>
                <td colspan="2" style="text-align:right;">${total}</td>
              </tr>
            </tfoot>
          </table>
          <table style="margin-top:20px;">
            <tr><td><strong>Discount:</strong></td><td>${discount}</td></tr>
            <tr><td><strong>VAT:</strong></td><td>${VAT}</td></tr>
            <tr><td><strong>Net Total:</strong></td><td>${netTotal}</td></tr>
          </table>
          <div style="text-align:center; margin-top:20px;">
            <p><strong>Software Developed with love by</strong></p>
            <h6><a href="https://technicmentors.com/" target="_blank">Technic Mentors</a></h6>
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
    }
    catch (error) {
        console.error("Error creating sale data:", error);
        res.status(500).send({ message: "An unexpected error occurred." });
    }
};
exports.printSalesData = printSalesData;
