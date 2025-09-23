"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRequest = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const Sales_1 = __importDefault(require("../models/Sales"));
const SalesDetail_1 = __importDefault(require("../models/SalesDetail"));
const deleteRequest = async (req, res) => {
    try {
        const deleted = await Sales_1.default.deleteMany({});
        const deleted2 = await SalesDetail_1.default.deleteMany({});
        res.status(200).send(deleted);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
};
exports.deleteRequest = deleteRequest;
