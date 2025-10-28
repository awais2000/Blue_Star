import { Request, Response } from "express";
import mongoose from "mongoose";
import Receivables from "../models/Receivable";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";
import Loans from "../models/Loans";


export const addReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, date, paidCash } = req.body;

    const requiredFields = ["customerId", "date", "paidCash"];
    const missingFields = requiredFields.filter((f) => !req.body[f]);
    if (missingFields.length > 0) {
      res.status(400).json({ message: `${missingFields.join(", ")} is required` });
      return;
    }

    const numericPaid = Number(paidCash);
    if (isNaN(numericPaid) || numericPaid < 0) {
      res.status(400).json({ message: "Invalid paidCash value — must be a non-negative number" });
      return;
    }

    const customerLoans = await Loans.find({ status: "Y", customerId }).lean();
    if (!customerLoans.length) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    const totalBalance = customerLoans.reduce(
      (sum, loan) => sum + (Number(loan.price) || 0),
      0
    );

    const prevReceivables = await Receivables.find({ customerId, status: "Y" }).lean();
    const prevPaidSum = prevReceivables.reduce(
      (sum, r) => sum + (Number(r.paidCash) || 0),
      0
    );

    const totalPaid = prevPaidSum + numericPaid;
    const remainingCash = Math.max(0, totalBalance - totalPaid);

    const newReceivable = await Receivables.create({
      customerId,
      date,
      totalBalance: remainingCash,
      paidCash: numericPaid,
      remainingCash,
      status: "Y",
    });

    const populatedReceivable = await Receivables.findById(newReceivable._id)
      .populate("customerId")
      .lean();

    await Loans.updateMany(
      { customerId, status: "Y" },
      {
        $set: {
          receivable: totalPaid,     // how much has been paid so far
          total: remainingCash, // new outstanding balance
        },
      }
    );

    const flattenedReceivable = {
      _id: populatedReceivable?._id,
      customerId: populatedReceivable?.customerId?._id || null,
      customerName: (populatedReceivable?.customerId as any)?.customerName || null,
      date: populatedReceivable?.date,
      totalBalance: populatedReceivable?.totalBalance,
      paidCash: populatedReceivable?.paidCash,
      remainingCash: populatedReceivable?.remainingCash,
      status: populatedReceivable?.status,
      createdAt: populatedReceivable?.createdAt,
    };

    res.status(200).json(flattenedReceivable);
  } catch (e) {
    handleError(res, e);
  }
};




export const getReceivableDataById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; 

    if (!id) {
      res.status(400).json({ message: "Customer ID is required" });
      return;
    }

    const receivables = await Receivables.find({ customerId: id, status: "Y" })
      .sort({ createdAt: 1 })
      .populate("customerId")
      .lean();

    if (!receivables || receivables.length === 0) {
      res.status(404).json({ message: "No receivable records found for this customer." });
      return;
    }

    const flattenedData = receivables.map((r) => ({
      _id: r._id,
      customerId: r.customerId?._id || null,
      customerName: (r.customerId as any)?.customerName || null,
      date: r.date,
      totalBalance: r.totalBalance,
      paidCash: r.paidCash,
      remainingCash: r.remainingCash,
      status: r.status,
      createdAt: r.createdAt,
    }));

    const totalPaid = receivables.reduce((sum, r) => sum + (Number(r.paidCash) || 0), 0);
    const totalBalance = receivables[receivables.length - 1].totalBalance;

    res.status(200).json({
      totalPaid,
      totalBalance: totalBalance,
      receivables: flattenedData,
    });

  } catch (e) {
    handleError(res, e);
  }
};



export const updateReceivableData = async (req: Request, res: Response): Promise<void> => {

}