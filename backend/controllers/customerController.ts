import express from "express";
import Customer from "../models/Customers";
import { handleError } from "../utils/errorHandler";


export const addCustomer = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const {customerName, customerContact, customerAddress} = req.body;

        const requiredFields = ["customerName", "customerContact", "customerAddress"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if(missingFields.length > 0){
            res.status(400).send({message: `${missingFields.join(' ,')}`});
            return;
        };

        const newCustomer = Customer.create({
            customerName: customerName,
            customerContact: customerContact,
            customerAddress: customerAddress
        });

        res.status(201).send({
        message: "Customer added successfully",
        ...newCustomer[0]
        });

    }catch(error){
         handleError(res, error);
    }
}




export const getCustomer = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const limit: number = req.query.limit ? parseInt(req.query.limit as string, 10) : 10000000;
        const page: number = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const offset: number = (page - 1) * limit;

        const customers = await Customer.find({ status: "Y" })
        .sort({ customerName: 1 })
        .skip(offset)
        .limit(limit)
        .lean();

        res.status(200).send(customers);
    }
    catch(error){
        handleError(res, error);
    }
}





export const updateCustomer = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const id = req.params.id;

        if(!id){
            res.status(400).send({message: "Please Provide the ID!"});
        };

        const { customerName, customerContact, customerAddress } = req.body;

        const requiredFields = ["customerName", "customerContact", "customerAddress"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if(missingFields.length > 0){
            res.status(400).send({message: `${missingFields.join(' ,')}`});
            return;
        };


        const updatedCustomer = await Customer.findByIdAndUpdate(
      id, 
      {
        $set: {
          customerName,
          customerContact,
          customerAddress,
        },
      },
      { new: true } 
    );

    if (!updatedCustomer) {
      res.status(404).json({ message: "Customer not found!" });
      return;
    }

    res.status(200).send(updatedCustomer);
    }
    catch(error){
        handleError(res, error);
    }
}





export const deleteCustomer = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const id = req.params.id;
        if(!id){
            res.status(400).send({message: "Please Provide the ID!"});
        }
        const deletedCustomer = await Customer.updateOne(
            {_id: id},
            { $set: { status: "N" },}
        );

        res.status(200).send({...deletedCustomer[0]});
    }catch(error){
        handleError(res, error);
    }
}