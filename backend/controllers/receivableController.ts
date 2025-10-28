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
    if (!customerLoans || customerLoans.length === 0) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    const totalBalance = customerLoans.reduce((sum, loan) => sum + (Number(loan.price) || 0), 0);

    const prevReceivables = await Receivables.find({ customerId, status: "Y" }).lean();
    const prevPaidSum = prevReceivables.reduce((s, r) => s + (Number(r.paidCash) || 0), 0);

    const totalPaid = prevPaidSum + numericPaid;
    const remainingCash = Math.max(0, totalBalance - totalPaid);

    const newReceivable = await Receivables.create({
      customerId,
      date,
      totalBalance,
      paidCash: numericPaid,
      remainingCash,
      status: "Y",
    });

    const populatedReceivable = await Receivables.findById(newReceivable._id)
      .populate("customerId")
      .lean();

    const bulkOps = customerLoans.map((loan) => ({
      updateOne: {
        filter: { _id: loan._id },
        update: { $set: { total: remainingCash } },
      },
    }));
    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }

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
