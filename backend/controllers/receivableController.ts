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

    // 1) Fetch customer's active loans in chronological order (oldest -> newest)
    const customerLoans = await Loans.find({ status: "Y", customerId }).sort({ createdAt: 1 }).lean();
    if (!customerLoans.length) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    // 2) Compute the current total using your formula from getLoansById
    const lastLoan = customerLoans[customerLoans.length - 1];
    const receivable = customerLoans.reduce((sum, loan) => sum + (Number(loan.receivable) || 0), 0);
    const currentTotalBalance = (Number(lastLoan.total) || 0) - receivable;

    // 3) Sum previous receivables (already paid before this request)
    const prevReceivables = await Receivables.find({ customerId, status: "Y" }).lean();
    const prevPaidSum = prevReceivables.reduce((sum, r) => sum + (Number(r.paidCash) || 0), 0);

    // 4) Compute totals
    const totalPaid = prevPaidSum + numericPaid; // cumulative paid including this payment
    const remainingCash = Math.max(0, currentTotalBalance - totalPaid); // remaining outstanding

    // 5) Create the new Receivable record with updated totalBalance
    const newReceivable = await Receivables.create({
      customerId,
      date,
      totalBalance: currentTotalBalance, // Use the current calculated total instead of original
      paidCash: numericPaid,
      remainingCash,
      status: "Y",
    });

    // 6) Update loan totals and receivables
    let remainingPayment = numericPaid;
    const bulkOps: any[] = [];

    for (const loan of customerLoans) {
      const currentLoanTotal = Number(loan.total) || Number(loan.price) || 0;
      
      // If no remaining payment or loan is already paid off, skip updating total but update receivable
      if (remainingPayment <= 0 || currentLoanTotal <= 0) {
        const currentReceivable = Number(loan.receivable) || 0;
        const totalPaidForThisLoan = Math.min(currentReceivable + remainingPayment, Number(loan.price) || 0);
        
        bulkOps.push({
          updateOne: {
            filter: { _id: loan._id },
            update: {
              $set: {
                receivable: totalPaidForThisLoan,
                // total remains the same since no payment applied
              },
            },
          },
        });
        continue;
      }

      // Calculate how much of the current payment applies to this loan
      const paymentForThisLoan = Math.min(remainingPayment, currentLoanTotal);
      
      // Update remaining payment for next loans
      remainingPayment -= paymentForThisLoan;

      // Calculate new totals for this loan
      const newLoanTotal = Math.max(0, currentLoanTotal - paymentForThisLoan);
      const currentReceivable = Number(loan.receivable) || 0;
      const totalPaidForThisLoan = currentReceivable + paymentForThisLoan;

      bulkOps.push({
        updateOne: {
          filter: { _id: loan._id },
          update: {
            $set: {
              total: newLoanTotal, // Update with the calculated new loan total
              receivable: totalPaidForThisLoan,
            },
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }

    // 7) Populate receivable to return customerName
    const populatedReceivable = await Receivables.findById(newReceivable._id)
      .populate("customerId")
      .lean();

    // 8) Flatten response
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



export const updateReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // Receivable ID
    const { customerId, date, paidCash } = req.body;

    if (!id) {
      res.status(400).json({ message: "Receivable ID is required in params" });
      return;
    }

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

    const existingReceivable = await Receivables.findById(id).lean();
    if (!existingReceivable) {
      res.status(404).json({ message: "Receivable not found!" });
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

    const prevReceivables = await Receivables.find({
      customerId,
      status: "Y",
      _id: { $ne: id },
    }).lean();

    const prevPaidSum = prevReceivables.reduce(
      (sum, r) => sum + (Number(r.paidCash) || 0),
      0
    );

    const totalPaid = prevPaidSum + numericPaid;
    const remainingCash = Math.max(0, totalBalance - totalPaid);

    const updatedReceivable = await Receivables.findByIdAndUpdate(
      id,
      {
        customerId,
        date,
        totalBalance,
        paidCash: numericPaid,
        remainingCash,
        status: "Y",
      },
      { new: true }
    )
      .populate("customerId")
      .lean();

    await Loans.updateMany(
      { customerId, status: "Y" },
      {
        $set: {
          receivable: totalPaid, // total paid till now
          total: remainingCash,  // new outstanding loan balance
        },
      }
    );

    const flattenedReceivable = {
      _id: updatedReceivable?._id,
      customerId: updatedReceivable?.customerId?._id || null,
      customerName: (updatedReceivable?.customerId as any)?.customerName || null,
      date: updatedReceivable?.date,
      totalBalance: updatedReceivable?.totalBalance,
      paidCash: updatedReceivable?.paidCash,
      remainingCash: updatedReceivable?.remainingCash,
      status: updatedReceivable?.status,
      createdAt: updatedReceivable?.createdAt,
    };

    res.status(200).json(flattenedReceivable);
  } catch (e) {
    handleError(res, e);
  }
};