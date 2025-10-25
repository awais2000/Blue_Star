import express from "express";
import mongoose from "mongoose";
import Receivables from "../models/Receivable";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";
import Loans from "../models/Loans";



export const addReceivable = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { customerId, date, totalBalance, paid } = req.body;

    const requiredFields = ["customerId", "date", "totalBalance", "paid"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).send(`${missingFields.join(", ")} is required`);
      return;
    };

    const getUserLoan = await Loans.find({ customerId })
      .populate<{ productId: IProducts }>("productId")
      .populate("customerId")
      .lean();

    if (!getUserLoan || getUserLoan.length === 0) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    };

    const remainingLoan = getUserLoan.reduce((sum, loan) => sum + (Number(loan.price) || 0), 0);

    const addReceived = await Receivables.create({
        date,
        totalBalance,
        paid
    });

    res.status(200).json({ remainingLoan });
  } catch (e) {
    handleError(res, e);
  }
};