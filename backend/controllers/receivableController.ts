import { Request, Response } from "express";
import mongoose from "mongoose";
import Receivables from "../models/Receivable";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";
import Loans from "../models/Loans";



export const addReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, customerId, date, paidCash } = req.body;

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

    // 1) Get customer's active loans and compute totalBalance (sum of prices)
    const customerLoans = await Loans.find({ status: "Y", customerId }).lean();
    if (!customerLoans || customerLoans.length === 0) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    const totalBalance = customerLoans.reduce(
      (sum, loan) => sum + (Number(loan.price) || 0),
      0
    );

    // 2) Sum previous payments (already recorded in Receivables for this customer)
    const prevReceivables = await Receivables.find({ customerId, status: "Y" }).lean();
    const prevPaidSum = prevReceivables.reduce((s, r) => s + (Number(r.paidCash) || 0), 0);

    // 3) Compute cumulative paid and remaining cash
    const totalPaid = prevPaidSum + numericPaid;
    const remainingCash = Math.max(0, totalBalance - totalPaid); // cap at 0

    // 4) Create the new Receivable entry
    const newReceivable = await Receivables.create({
      productId: productId || null,
      customerId,
      date,
      totalBalance,
      paidCash: numericPaid,
      remainingCash,
      status: "Y",
    });

    // 5) Update loans' total to reflect the new remaining balance (user asked to update loan table)
    //    (This will set every active loan total for this customer to the new remainingCash,
    //     same approach you used earlier.)
    const bulkOps = customerLoans.map((loan) => ({
      updateOne: {
        filter: { _id: loan._id },
        update: { $set: { total: remainingCash } },
      },
    }));

    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }

    // 6) (Optional) fetch updated loans to return in response (flattened)
    const updatedLoans = await Loans.find({ status: "Y", customerId })
      .sort({ date: 1, _id: 1 })
      .populate<{ productId: IProducts }>("productId")
      .populate("customerId")
      .lean();

    const flattenedLoans = updatedLoans.map((loan) => ({
      _id: loan._id,
      productId: loan.productId?._id || null,
      productName: (loan.productId as any)?.productName || null,
      customerId: (loan.customerId as any)?._id || null,
      customerName: (loan.customerId as any)?.customerName || null,
      price: loan.price,
      total: loan.total,
      date: loan.date,
      status: loan.status,
      createdAt: loan.createdAt,
    }));

    // 7) Flatten receivable for response
    const flattenedReceivable = {
      _id: newReceivable._id,
      productId: newReceivable.productId || null,
      customerId: newReceivable.customerId,
      date: newReceivable.date,
      totalBalance: newReceivable.totalBalance,
      paidCash: newReceivable.paidCash,
      remainingCash: newReceivable.remainingCash,
      status: newReceivable.status,
      createdAt: newReceivable.createdAt,
    };

    res.status(200).json({
      ...flattenedReceivable
    });
  } catch (e) {
    handleError(res, e);
  }
};