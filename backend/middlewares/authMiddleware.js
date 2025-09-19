"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const express_1 = __importDefault(require("express"));
const express = express_1.default;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
//  Fix: Ensure Proper `next()` Usage
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
        res.status(401).json({ status: 401, message: "Access Denied. No Token Provided." });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, "your_secret_key");
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({ status: 403, message: "Invalid Token" });
    }
};
exports.authenticateToken = authenticateToken;
