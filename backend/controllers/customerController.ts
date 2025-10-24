import express from "express";
import Customer from "../models/Customers";
import { handleError } from "../utils/errorHandler";


export const addCustomer = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const {customerName, customerContact, date} = req.body;

        console.log(req.body);

        const requiredFields = ["customerName"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if(missingFields.length > 0){
            res.status(400).send({message: `${missingFields.join(' ,')}`});
            return;
        };

         const newCustomer = await Customer.create({
          customerName,
          customerContact,
          date,
          status: "Y"
        });

    const addedCustomer = await Customer.findOne({
      _id: newCustomer._id,
      status: "Y"
    }).lean(); 

    if (!addedCustomer) {
      res.status(404).send({ message: "Customer not found after creation." });
      return;
    }

    res.status(201).send({
      message: "Customer added successfully!",
      ...addedCustomer
    });

    }catch(error){
         handleError(res, error);
    }
};



export const getCustomer = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const limit: number = req.query.limit ? parseInt(req.query.limit as string, 10) : 10000000;
    const page: number = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const offset: number = (page - 1) * limit;

    const query: any = { status: "Y" };

    const search = req.query.search as string;
    if (search) {
      query.$or = [
        { customerName: { $regex: new RegExp(search, "i") } },
        { customerContact: { $regex: new RegExp(search, "i") } },
        { email: { $regex: new RegExp(search, "i") } },
      ];
    }

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (req.query.fromDate) {
      const from = new Date(req.query.fromDate as string);
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        fromDate = from;
      }
    }

    if (req.query.toDate) {
      const to = new Date(req.query.toDate as string);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        toDate = to;
      }
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = fromDate;
      if (toDate) query.createdAt.$lte = toDate;
    }

    const customers = await Customer.find(query)
      .collation({ locale: "en", strength: 2 })
      .sort({ customerName: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    if (!customers || customers.length === 0) {
      res.status(404).json();
      return;
    }

    res.status(200).json( customers );
  } catch (error) {
    handleError(res, error);
  }
};



export const updateCustomer = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const id = req.params.id;

        if(!id){
            res.status(400).send({message: "Please Provide the ID!"});
        };

        const { customerName, customerContact, date } = req.body;

        const requiredFields = ["customerName"];
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
              date,
            },
          },
          { new: true } 
        );

    if (!updatedCustomer) {
      res.status(404).json({ message: "Customer not found!" });
      return;
    }

    res.status(200).send({...updatedCustomer[0]});
    }
    catch(error){
        handleError(res, error);
    }
};



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
};



export const getCustomerById = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const id = req.params.id;

        if(!id){
            res.status(400).send({message: "Please Provide the ID!"});
        };

        const limit: number = req.query.limit ? parseInt(req.query.limit as string, 10) : 10000000;
        const page: number = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const offset: number = (page - 1) * limit;

        const customers = await Customer.find({
        _id: id,
        status: "Y"
        })
        .sort({ customerName: 1 })
        .skip(offset)
        .limit(limit)
        .lean();

        res.status(200).send(customers);
    }
    catch(error){
        handleError(res, error);
    }
};