import pkg from "express";
const express = pkg;
type Application = pkg.Application;
type Request = pkg.Request;
type Response = pkg.Response;

import { addUser, login, updateUser } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware"
import { addProduct, deleteProducts, getProductById, getProducts, searchProduct, updateProduct } from "../controllers/productController";
import {upload} from "../middlewares/uploadMiddleware";
import { addCustomer, deleteCustomer, getCustomer, getCustomerById, updateCustomer } from "../controllers/customerController";
import { addProductToCart, createSaleData, deleteFromCart, deleteFromSaleDetails, getProductInCart, getSalesData, getSalesDataById, printSalesData, searchSalesData, } from "../controllers/salesController";
import { deleteRequest, resetCartData } from "../controllers/deleteController";
import { addPrintConfig, getPrintConfig, } from "../controllers/receiptController";
import { fcreateSaleData, fgetSalesData, fgetSalesDataById, fprintSalesData } from "../controllers/testSalesController";
import { addLoan, deleteLoan, getLoanById, updateLoan } from "../controllers/loanController";


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

    app.get('/getPrintConfig', getPrintConfig);

    app.post('/addProductToCart', addProductToCart);

    app.get('/getProductInCart', getProductInCart);

    app.patch('/deleteFromCart/:id', deleteFromCart);

    app.get('/getSalesData', getSalesData);

    app.get('/searchSalesData', searchSalesData);

    app.get('/getSalesDataById/:id', getSalesDataById);

    app.get('/deleteFromSaleDetails', deleteFromSaleDetails);

    app.post('/resetCartData', resetCartData);

    app.get('/getCustomerById/:id', getCustomerById);

    app.post('/addLoan', addLoan);

    app.get('/getLoanById/:id', getLoanById);

    app.put('/updateLoan/:id', updateLoan);

    app.patch('/deleteLoan/:id', deleteLoan);

    //for testing data:
    app.post('/fcreateSaleData', fcreateSaleData);
 
    app.post('/fprintSalesData', fprintSalesData);

    app.get('/fgetSalesDataById/:id', fgetSalesDataById);

    app.get('/fgetSalesData', fgetSalesData);
}