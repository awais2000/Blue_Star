import pkg from "express";
const express = pkg;
type Application = pkg.Application;
type Request = pkg.Request;
type Response = pkg.Response;

import { addUser, login, updateUser } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware"
import { addProduct, deleteProducts, getProductById, getProducts, searchProduct, updateProduct } from "../controllers/productController";
import {upload} from "../middlewares/uploadMiddleware";
import { addCustomer, deleteCustomer, getCustomer, updateCustomer } from "../controllers/customerController";
import { addProductToCart, createSaleData, deleteFromCart, deleteFromSaleDetails, getProductInCart, getSalesData, getSalesDataById, printSalesData, searchSalesData, } from "../controllers/salesController";
import { deleteRequest } from "../controllers/deleteController";
import { addPrintConfig, } from "../controllers/receiptController";


export default (app: Application): void => {
    app.post('/addUser', addUser);

    app.post('/login', login);

    app.put('/updateUser/:id', updateUser);

    app.post('/addProduct', upload.single('image'), addProduct);

    app.get('/getProducts', getProducts);

    app.put('/updateProduct/:id', upload.single('image'), updateProduct);

    app.patch('/deleteProducts/:id', deleteProducts);

    app.get('/getProductById/:id', getProductById);

    app.get('/searchProduct', searchProduct);

    app.post('/addCustomer', addCustomer);

    app.get('/getCustomers', getCustomer);

    app.patch('/deleteCustomer/:id', deleteCustomer);

    app.put('/updateCustomer/:id', updateCustomer);

    app.post('/createSaleData', createSaleData);

    app.post('/deleteRequest', deleteRequest);

    app.post('/printSalesData', printSalesData);

    app.post('/addPrintConfig', addPrintConfig);

    app.post('/addProductToCart', addProductToCart);

    app.get('/getProductInCart', getProductInCart);

    app.patch('/deleteFromCart/:id', deleteFromCart);

    app.get('/getSalesData', getSalesData);

    app.get('/searchSalesData', searchSalesData);
    
    app.get('/getSalesDataById/:id', getSalesDataById);

    app.get('/deleteFromSaleDetails', deleteFromSaleDetails);
}