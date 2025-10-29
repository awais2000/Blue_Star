import express from "express";
import { handleError } from "../utils/errorHandler";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales";
import SalesDetail from "../models/SalesDetail";
import TempProducts from "../models/tempProducts";
import Receivables from "../models/Receivable";
import Loans from "../models/Loans";



export const deleteRequest = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        // const deleted = await Sales.deleteMany({});
        const deleted2 = await Loans.deleteMany({});

        res.status(200).send(deleted2);
    }catch(error){
        handleError(res, error);
    }
}





export const resetCartData = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const deleted = await TempProducts.deleteMany({});

        res.status(200).send();
    }catch(error){
        handleError(res, error);
    }
}