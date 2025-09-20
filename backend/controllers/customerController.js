"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.getCustomer = exports.addCustomer = void 0;
const Customers_1 = __importDefault(require("../models/Customers"));
const errorHandler_1 = require("../utils/errorHandler");
const addCustomer = async (req, res) => {
    try {
        const { customerName, customerContact, customerAddress } = req.body;
        const requiredFields = ["customerName", "customerContact", "customerAddress"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            res.status(400).send({ message: `${missingFields.join(' ,')}` });
            return;
        }
        ;
        const newCustomer = Customers_1.default.create({
            customerName: customerName,
            customerContact: customerContact,
            customerAddress: customerAddress
        });
        res.status(201).send({
            message: "Customer added successfully",
            ...newCustomer[0]
        });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
};
exports.addCustomer = addCustomer;
const getCustomer = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10000000;
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const offset = (page - 1) * limit;
        const customers = await Customers_1.default.find({ status: "Y" })
            .sort({ customerName: 1 })
            .skip(offset)
            .limit(limit)
            .lean();
        res.status(200).send(customers);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
};
exports.getCustomer = getCustomer;
const updateCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            res.status(400).send({ message: "Please Provide the ID!" });
        }
        ;
        const { customerName, customerContact, customerAddress } = req.body;
        const requiredFields = ["customerName", "customerContact", "customerAddress"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            res.status(400).send({ message: `${missingFields.join(' ,')}` });
            return;
        }
        ;
        const updatedCustomer = await Customers_1.default.findByIdAndUpdate(id, {
            $set: {
                customerName,
                customerContact,
                customerAddress,
            },
        }, { new: true });
        if (!updatedCustomer) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }
        res.status(200).send(updatedCustomer);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            res.status(400).send({ message: "Please Provide the ID!" });
        }
        const deletedCustomer = await Customers_1.default.updateOne({ _id: id }, { $set: { status: "N" }, });
        res.status(200).send({ ...deletedCustomer[0] });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
};
exports.deleteCustomer = deleteCustomer;
