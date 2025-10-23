import express from "express";
import Loans from "../models/Loans";
import { handleError } from "../utils/errorHandler";


export const addLoan = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const { productId, customerId, debit, date} = req.body;
        const requiredFields = ["productId", "customerId", "debit", "date"];
        const missingFields = requiredFields.filter(field=> !req.body[field]);
        if(missingFields.length > 0){
            res.status(400).send({message: "Bad Request!"});
            return;
        };

        const getTotal = await Loans.find({status: 'Y'});

        let total = getTotal.reduce((sum, loan) => sum + loan.debit, 0) + debit;

        console.log(getTotal);
        
        const newLoan = await Loans.create({
            productId,
            customerId,
            debit,
            date,
            total
        });
        
        res.status(200).send(newLoan.toObject());
    }
    catch(e){
        handleError(res, e);
    }
}



export const getLoan = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const getLoan = await Loans.find({status: 'Y'});
        
        if(getLoan.length < 0){
            res.status(200).send({message: "No Loan detail found!"});
            return;
        }

        

    }catch(e){
        handleError(res, e);
    }
}