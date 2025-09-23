"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSaleData = void 0;
const Invoice_1 = __importDefault(require("../models/Invoice"));
const Sales_1 = __importDefault(require("../models/Sales"));
const SalesDetail_1 = __importDefault(require("../models/SalesDetail"));
const errorHandler_1 = require("../utils/errorHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const createSaleData = async (req, res) => {
    try {
        const { productId, customerName, customerContact, unitPrice, discount, date, QTY, total, VAT, netTotal, } = req.body;
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
        let invoice = await Invoice_1.default.findOne();
        let currentInvoiceNo;
        if (invoice) {
            currentInvoiceNo = invoice.invoiceNo;
            invoice.invoiceNo = currentInvoiceNo + 1;
            await invoice.save();
        }
        else {
            currentInvoiceNo = 1;
            invoice = await Invoice_1.default.create({ invoiceNo: currentInvoiceNo });
        }
        const newSale = await SalesDetail_1.default.create({
            productId: new mongoose_1.default.Types.ObjectId(productId), // important
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
        await Sales_1.default.create({
            productId,
            invoiceNo: currentInvoiceNo,
        });
        const populatedSale = await SalesDetail_1.default.findById(newSale._id)
            .populate("productId")
            .lean();
        res.status(200).send({
            message: "Purchase Successful!",
            ...populatedSale.toObject(),
        });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
};
exports.createSaleData = createSaleData;
