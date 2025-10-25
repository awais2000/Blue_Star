import { Request, Response } from "express";
import mongoose from "mongoose";
import Receivables from "../models/Receivable";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";
import Loans from "../models/Loans";




export const addReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, customerId, date, paidCash } = req.body;

    // ✅ 1. Validate required fields
    const requiredFields = ["customerId", "date", "paidCash"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ message: `${missingFields.join(", ")} is required` });
      return;
    }

    const numericPaid = Number(paidCash);
    if (isNaN(numericPaid)) {
      res.status(400).json({ message: "Invalid paidCash value — must be a number" });
      return;
    }

    // ✅ 2. Get customer's active loans
    const customerLoans = await Loans.find({ status: "Y", customerId })
      .populate<{ productId: IProducts }>("productId")
      .populate("customerId")
      .lean();

    if (!customerLoans || customerLoans.length === 0) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    // ✅ 3. Calculate total balance (sum of all loan prices)
    const totalBalance = customerLoans.reduce(
      (sum, loan) => sum + (Number(loan.price) || 0),
      0
    );

    // ✅ 4. Calculate remaining cash after payment
    const remainingCash = totalBalance - numericPaid;

    // ✅ 5. Create a new Receivable record
    const newReceivable = await Receivables.create({
      productId,
      customerId,
      date,
      totalBalance,
      paidCash: numericPaid,
      remainingCash,
      status: "Y",
    });

    // ✅ 6. Update all customer loans’ totals to reflect new remaining balance
    // (This ensures consistency across loan records)
    const bulkOps = customerLoans.map((loan) => ({
      updateOne: {
        filter: { _id: loan._id },
        update: { $set: { total: remainingCash, receivable: paidCash } },
      },
    }));

    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }

    // ✅ 7. Flatten response (no nested objects)
    const flattenedReceivable = {
      _id: newReceivable._id,
      customerId: newReceivable.customerId,
      date: newReceivable.date,
      totalBalance: newReceivable.totalBalance,
      paidCash: newReceivable.paidCash,
      remainingCash: newReceivable.remainingCash,
      status: newReceivable.status,
      createdAt: newReceivable.createdAt,
    };

    res.status(200).json({
      ...flattenedReceivable,
    });
  } catch (e) {
    handleError(res, e);
  }
};