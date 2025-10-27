import { Request, Response } from "express";
import mongoose from "mongoose";
import Receivables from "../models/Receivable";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";
import Loans from "../models/Loans";



export const addReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productName, customerId, date, paidCash } = req.body;

    // Validate required fields
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

    // 1️⃣ Get customer's active loans
    const customerLoans = await Loans.find({ status: "Y", customerId }).lean();
    if (!customerLoans || customerLoans.length === 0) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    const totalBalance = customerLoans.reduce((sum, loan) => sum + (Number(loan.price) || 0), 0);

    // 2️⃣ Sum previous receivables
    const prevReceivables = await Receivables.find({ customerId, status: "Y" }).lean();
    const prevPaidSum = prevReceivables.reduce((s, r) => s + (Number(r.paidCash) || 0), 0);

    // 3️⃣ Compute remaining
    const totalPaid = prevPaidSum + numericPaid;
    const remainingCash = Math.max(0, totalBalance - totalPaid);

    // 4️⃣ Create new receivable
    const newReceivable = await Receivables.create({
      productName: productName || null,
      customerId,
      date,
      totalBalance,
      paidCash: numericPaid,
      remainingCash,
      status: "Y",
    });

    // ✅ Populate the customer so we can return name
    const populatedReceivable = await Receivables.findById(newReceivable._id)
      .populate("customerId")
      .lean();

    // 5️⃣ Update loan totals
    const bulkOps = customerLoans.map((loan) => ({
      updateOne: {
        filter: { _id: loan._id },
        update: { $set: { total: remainingCash } },
      },
    }));
    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }

    // 6️⃣ Flatten for response
    const flattenedReceivable = {
      _id: populatedReceivable?._id,
      productName: populatedReceivable?.productName,
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
