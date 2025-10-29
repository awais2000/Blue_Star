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
    // We need 'price' (original loan amount) and 'receivable' (amount paid for that loan)
    const customerLoans = await Loans.find({ status: "Y", customerId }).sort({ createdAt: 1 }).lean();
    if (!customerLoans.length) {
      res.status(404).json({ message: "No active loans found for this customer." });
      return;
    }

    // --- START: Logic to calculate CURRENT OUTSTANDING BALANCE (from getLoanById) ---
    // 2a) Get the latest loan's overall cumulative total (which includes all loans)
    const latestCumulativeTotal = Number(customerLoans[customerLoans.length - 1].total) || 0;
    
    // 2b) Sum previous receivables (amounts recorded as paid on individual loan documents)
    const totalPastLoanReceivables = customerLoans.reduce(
      (sum, loan) => sum + (Number(loan.receivable) || 0),
      0
    );

    // 3) Calculate the CURRENT OUTSTANDING BALANCE before this payment (Your Goal: totalBalance)
    // Outstanding Total = Latest Loan Cumulative Total - Sum of all past Loan.receivable amounts
    const currentOutstandingBalance = Math.max(0, latestCumulativeTotal - totalPastLoanReceivables);
    // --- END: Logic to calculate CURRENT OUTSTANDING BALANCE ---

    // 4) Compute totals for the new Receivable record
    // The total balance for the Receivable record is the amount OWED BEFORE THIS PAYMENT
    const receivableTotalBalance = currentOutstandingBalance; 
    const remainingCash = Math.max(0, currentOutstandingBalance - numericPaid); // remaining outstanding AFTER THIS payment

    // 5) Create the new Receivable record
    const newReceivable = await Receivables.create({
      customerId,
      date,
      // **GOAL ACHIEVED: Use the calculated outstanding balance as the totalBalance**
      totalBalance: receivableTotalBalance, 
      paidCash: numericPaid,
      remainingCash,
      status: "Y",
    });

    // 6) Apply payment to loans (FIFO - First-In, First-Out)
    let remainingPayment = numericPaid;
    const bulkOps: any[] = [];
    let newLatestCumulativeTotal = latestCumulativeTotal; // Start with the pre-payment cumulative total

    for (const loan of customerLoans) {
      // Amount remaining to be paid for this specific loan (original price - amount already received)
      const originalLoanPrice = Number(loan.price) || 0;
      const currentReceivable = Number(loan.receivable) || 0;
      const loanOutstanding = Math.max(0, originalLoanPrice - currentReceivable);

      // If no payment left or loan is paid off, break the loop
      if (remainingPayment <= 0 || loanOutstanding <= 0) {
        break; 
      }

      // Calculate how much of the current payment applies to this loan
      const paymentForThisLoan = Math.min(remainingPayment, loanOutstanding);
      
      // Update the remaining payment
      remainingPayment -= paymentForThisLoan;

      // Update receivable field for this loan
      const newReceivableForLoan = currentReceivable + paymentForThisLoan;

      // Prepare the update operation for this loan
      bulkOps.push({
        updateOne: {
          filter: { _id: loan._id },
          update: {
            $set: {
              // Only update the 'receivable' field for individual loans
              receivable: newReceivableForLoan,
            },
          },
        },
      });
    }

    // 7) Update the overall cumulative total (Loans.total) on the LATEST loan document
    // We update the 'total' field of the latest loan to reflect the final outstanding amount.
    // This maintains the consistency with how your 'addLoan' uses this field.
    newLatestCumulativeTotal = Math.max(0, newLatestCumulativeTotal - numericPaid);

    bulkOps.push({
        updateOne: {
            filter: { _id: customerLoans[customerLoans.length - 1]._id },
            update: {
                $set: {
                    total: newLatestCumulativeTotal, // New customer cumulative total
                },
            },
        },
    });

    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }
    
    // 8) Populate receivable to return customerName
    const populatedReceivable = await Receivables.findById(newReceivable._id)
      .populate("customerId")
      .lean();

    // 9) Flatten response
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
    // Assuming 'handleError' is defined elsewhere
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


