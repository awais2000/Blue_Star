import pkg from "express";
const express = pkg;
type Application = pkg.Application;
type Request = pkg.Request;
type Response = pkg.Response;

import { addUser, login } from "../controllers/authController.ts";
import { authenticateToken } from "../middlewares/authMiddleware.ts"
import { addProduct, deleteProducts, getProducts, getUploadedFile, searchProduct, updateProduct } from "../controllers/productController.ts";
import {upload} from "../middlewares/uploadMiddleware.ts";


export default (app: Application): void => {
    app.post('/addUser', authenticateToken, addUser);

    app.post('/login', login);

    app.post('/addProduct', upload.single('image'), addProduct);

    app.get('/getUploadedFile', getUploadedFile);

    app.get('/getProducts', getProducts);

    app.put('/updateProduct/:id', upload.single('image'), updateProduct);

    app.patch('/deleteProducts/:id', deleteProducts);

    app.get('/searchProduct', searchProduct);
}