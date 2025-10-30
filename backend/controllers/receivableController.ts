import { Request, Response } from "express";
import mongoose from "mongoose";
import Receivables from "../models/Receivable";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";
import Loans from "../models/Loans";


export const addReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, date, paidCash } = req.body;

    // --- validation ---
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

    // --- fetch customer active loans (oldest first) ---
    const customerLoans = await Loans.find({ status: "Y", customerId }).sort({ createdAt: 1 }).lean();
    if (!customerLoans.length) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    // --- compute customer-level totalBalance as SUM(price) across all loans ---
    // (Assumes 'price' holds the per-loan total amount you want to count)
    const totalBalanceSum = customerLoans.reduce((acc, l) => acc + (Number((l as any).price) || 0), 0);

    // --- sum previous payments from Receivables history (if you keep Receivables) ---
    // If you don't use Receivables collection, we can sum from loans' receivable field instead.
    let prevPaidSum = 0;
    if (typeof Receivables !== "undefined") {
      const prevReceivables = await Receivables.find({ customerId, status: "Y" }).lean();
      prevPaidSum = prevReceivables.reduce((s, r) => s + (Number((r as any).paidCash) || 0), 0);
    } else {
      // Fallback: sum receivable field from loans themselves
      prevPaidSum = customerLoans.reduce((s, l) => s + (Number((l as any).receivable) || 0), 0);
    }

    // --- compute totals including this payment ---
    const totalPaid = prevPaidSum + numericPaid; // cumulative paid including this request
    const remainingCash = Math.max(0, totalBalanceSum - totalPaid);

    // --- create receivable history record (keeps history and stores the customer-level totalBalance) ---
    let newReceivableDoc: any = null;
    if (typeof Receivables !== "undefined") {
      newReceivableDoc = await Receivables.create({
        customerId,
        date,
        totalBalance: totalBalanceSum,
        paidCash: numericPaid,
        remainingCash,
        status: "Y",
      });
    }

    // --- distribute the payment across loans (FIFO: oldest -> newest) ---
    let remainingPayment = numericPaid;
    const bulkOps: any[] = [];

    for (const loan of customerLoans) {
      // Original per-loan amount to pay from 'price' (you requested price be used for totalBalance).
      // receivable (already paid for that loan) might exist; calculate remaining for that loan:
      const loanPrice = Number((loan as any).price) || 0;
      const loanAlreadyPaid = Number((loan as any).receivable) || 0;
      const loanRemaining = Math.max(0, loanPrice - loanAlreadyPaid);

      // If there's nothing left to apply to this loan, still ensure it has customer-level totals saved
      if (remainingPayment <= 0 && loanRemaining === 0) {
        // loan already fully paid — set loan fields appropriately (status N)
        bulkOps.push({
          updateOne: {
            filter: { _id: loan._id },
            update: {
              $set: {
                total: 0,
                receivable: loanPrice,
                totalBalance: totalBalanceSum,
                remainingCash,
                status: "N",
              },
            },
          },
        });
        continue;
      }

      if (remainingPayment <= 0) {
        // nothing left to allocate, but still set totalBalance & remainingCash
        bulkOps.push({
          updateOne: {
            filter: { _id: loan._id },
            update: {
              $set: {
                total: loanRemaining, // unchanged
                totalBalance: totalBalanceSum,
                remainingCash,
              },
            },
          },
        });
        continue;
      }

      // Payment portion applied to this loan
      const paymentForThisLoan = Math.min(loanRemaining, remainingPayment);

      const newReceivableForLoan = loanAlreadyPaid + paymentForThisLoan; // cumulative paid for this loan
      const newLoanTotalRemaining = Math.max(0, loanPrice - newReceivableForLoan); // remaining for this loan after payment

      remainingPayment -= paymentForThisLoan;

      bulkOps.push({
        updateOne: {
          filter: { _id: loan._id },
          update: {
            $set: {
              receivable: newReceivableForLoan,
              total: newLoanTotalRemaining,
              totalBalance: totalBalanceSum,
              remainingCash,
              // If this loan now fully paid, mark status N
              status: newLoanTotalRemaining === 0 ? "N" : "Y",
            },
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }

    // --- re-fetch updated loans for response ---
    const updatedLoans = await Loans.find({ customerId }).populate("customerId").lean();

    // --- response object: include the created receivable document (if any) and updated loans ---
    res.status(200).json({
      message: "Receivable updated successfully.",
      totalBalance: totalBalanceSum,
      paidThisTime: numericPaid,
      totalPaid,
      remainingCash,
      receivable: newReceivableDoc ? {
        _id: newReceivableDoc._id,
        totalBalance: newReceivableDoc.totalBalance,
        paidCash: newReceivableDoc.paidCash,
        remainingCash: newReceivableDoc.remainingCash,
      } : null,
      updatedLoans,
    });
  } catch (e) {
    handleError(res, e);
  }
};


export const getReceivableDataById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // customerId

    if (!id) {
      res.status(400).json({ message: "Customer ID is required" });
      return;
    }

    // 1️⃣ Get all receivables for this customer
    const receivables = await Receivables.find({ customerId: id, status: "Y" })
      .sort({ createdAt: 1 })
      .populate("customerId")
      .lean();

    if (!receivables || receivables.length === 0) {
      res.status(200).json({
        message: "No receivable records found for this customer.",
        totalBalance: 0,
        totalPaid: 0,
        remainingCash: 0,
        receivables: [],
      });
      return;
    }

    // 2️⃣ Flatten the receivables data for clean output
    const flattenedData = receivables.map((r) => ({
      _id: r._id,
      customerId: r.customerId?._id || null,
      customerName: (r.customerId as any)?.customerName || null,
      date: r.date,
      totalBalance: Number(r.totalBalance) || 0,
      paidCash: Number(r.paidCash) || 0,
      remainingCash: Number(r.remainingCash) || 0,
      status: r.status,
      createdAt: r.createdAt,
    }));

    // 3️⃣ Calculate totalPaid (sum of all receivables)
    const totalPaid = flattenedData.reduce((sum, r) => sum + (Number(r.paidCash) || 0), 0);

    // 4️⃣ Fetch total loan balance (sum of all loan.price)
    const activeLoans = await Loans.find({ customerId: id, status: "Y" }).lean();
    const totalBalance = activeLoans.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

    // 5️⃣ Compute remaining cash
    const remainingCash = Math.max(0, totalBalance - totalPaid);

    // 6️⃣ Update all loans’ totalBalance + remainingCash for consistency
    await Loans.updateMany(
      { customerId: id, status: "Y" },
      { $set: { totalBalance, remainingCash } }
    );

    // 7️⃣ Return consistent structure
     res.status(200).json({
      totalPaid,
      totalBalance,
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


