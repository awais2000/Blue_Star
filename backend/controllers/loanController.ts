import express from "express";
import Loans from "../models/Loans";
import { handleError } from "../utils/errorHandler";



export const addLoan = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { productId, customerId, price, date } = req.body;

    const requiredFields = ["productId", "customerId", "price", "date"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).send(`${missingFields.join(", ")} is required`);
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      res.status(400).send("Invalid price: must be a number");
      return;
    }

    const customerLoans = await Loans.find({ status: "Y", customerId });

    const total =
      customerLoans.reduce((sum, loan) => sum + (Number(loan.price) || 0), 0) +
      numericPrice;

    const newLoan = await Loans.create({
      productId,
      customerId,
      price: numericPrice,
      date,
      total,
    });

    res.status(200).json(newLoan.toObject());
  } catch (e) {
    handleError(res, e);
  }
};





export const getLoan = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const getLoan = await Loans.find({status: 'Y'})
        .sort({ createdAt: 1 })
        .lean();

        if(getLoan.length < 0){
            res.status(200).send({message: "No Loan detail found!"});
            return;
        };

        res.status(200).send(getLoan);

    }catch(e){
        handleError(res, e);
    }
};



export const updateLoan = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const id = req.params.id;

        if(!id){
            res.status(400).send({message: "Please provide ID!"});
            return;
        }

        const { productId, customerId, price, date} = req.body;
        const requiredFields = ["productId", "customerId", "price", "date"];
        const missingFields = requiredFields.filter(field=> !req.body[field]);
        if(missingFields.length > 0){
            res.status(400).send({message: "Bad Request!"});
            return;
        };

        const getTotal = await Loans.find({status: 'Y'});

        let total = getTotal.reduce((sum, loan) => sum + loan.price, 0) + price;

        console.log(getTotal);

        const updatedLoan = await Loans.findByIdAndUpdate(
            id, 
            {
                $set: {
                    productId,
                    customerId,
                    price,
                    date,
                    total,
                },
            },
            { new: true } 
            );

        if (!updatedLoan) {
        res.status(404).json({ message: "Customer not found!" });
        return;
        };

        res.status(200).send({...updatedLoan[0]});

    }catch(e){
        handleError(res, e);
    }
}



export const deleteLoan = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const id = req.params.id;
        if(!id){
            res.status(400).send({message: "Please Provide the ID!"});
        }
        const deletedLoan = await Loans.updateOne(
            {_id: id},
            { $set: { status: "N" },}
        );

        res.status(200).send({...deletedLoan[0]});
    }catch(error){
        handleError(res, error);
    }
};