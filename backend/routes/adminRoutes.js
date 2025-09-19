"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express = express_1.default;
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const productController_1 = require("../controllers/productController");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
exports.default = (app) => {
    app.post('/addUser', authMiddleware_1.authenticateToken, authController_1.addUser);
    app.post('/login', authController_1.login);
    app.post('/addProduct', uploadMiddleware_1.upload.single('image'), productController_1.addProduct);
    // app.get('/getUploadedFile', getUploadedFile);
    app.get('/getProducts', productController_1.getProducts);
    app.put('/updateProduct/:id', uploadMiddleware_1.upload.single('image'), productController_1.updateProduct);
    app.patch('/deleteProducts/:id', productController_1.deleteProducts);
    app.get('/searchProduct', productController_1.searchProduct);
};
