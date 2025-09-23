import express from "express";
import { handleError } from "../utils/errorHandler";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales";
import SalesDetail from "../models/SalesDetail";

export const deleteRequest = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const deleted = await Sales.deleteMany({});
        const deleted2 = await SalesDetail.deleteMany({});

        res.status(200).send(deleted);
    }catch(error){
        handleError(res, error);
    }
}