import express from "express";
import mongoose from "mongoose";
import Loans from "../models/Loans";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";

export const addLoan = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { productId, customerId, price, date } = req.body;

    // 1. Validate required fields
    const requiredFields = ["productId", "customerId", "price", "date"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).send(`${missingFields.join(", ")} is required`);
      return;
    }

    // 2. Validate price
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      res.status(400).send("Invalid price: must be a number");
      return;
    }

    // 3. Get all active loans for the customer
    const customerLoans = await Loans.find({ status: "Y", customerId });

    // 4. Compute current total (existing prices + new price) as you already had
    const total = customerLoans.reduce((sum, loan) => sum + (Number(loan.price) || 0), 0) + numericPrice;

    // 5. Create new loan (note: we keep same fields you used)
    const newLoan = await Loans.create({
      productId,
      customerId,
      price: numericPrice,
      date,
      total,
      status: "Y",
    });

    // 6. Populate product and customer details
    const populatedLoan = await Loans.findById(newLoan._id)
      .populate<{ productId: IProducts }>("productId")
      .populate("customerId")
      .lean();

    // 7. Defensive: ensure populatedLoan exists
    if (!populatedLoan) {
      res.status(500).json({ success: false, message: "Failed to fetch created loan" });
      return;
    }

    // 8. Flatten loan for response
    const flattenedLoan = {
      _id: populatedLoan._id,
      productId: populatedLoan.productId?._id || null,
      productName: populatedLoan.productId?.productName || null,
      productQuantity: populatedLoan.productId?.quantity || null,
      customerId: (populatedLoan.customerId as any)?._id || null,
      customerName: (populatedLoan.customerId as any)?.customerName || null,
      price: populatedLoan.price,
      receivable: populatedLoan.receivable ?? 0,
      total: populatedLoan.total,
      date: populatedLoan.date,
      status: populatedLoan.status,
      createdAt: populatedLoan.createdAt,
    };

    // 9. Compute receivable SUM from existing loan.receivable fields (NOT price)
    const existingReceivableSum = customerLoans.reduce(
      (sum, loan) => sum + (Number(loan.receivable) || 0),
      0
    );

    // include new loan's receivable (if any) — do NOT include price
    const newReceivable = Number(populatedLoan.receivable) || 0;
    const receivable = existingReceivableSum + newReceivable;

    console.log("Receivable total (sum of receivable fields):", receivable);

    // 10. Send response
    res.status(200).json({
      total,
      receivable,
      loan: flattenedLoan,
    });
  } catch (e) {
    handleError(res, e);
  }
};


export const getLoanById = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params; // this is customerId

    const loans = await Loans.find({ status: "Y", customerId: id })
      .sort({ createdAt: 1 })
      .populate<{ productId: IProducts }>("productId")
      .populate("customerId")
      .lean();

    if (!loans || loans.length === 0) {
      res.status(200).json({ message: "No loan details found!", total: 0, loans: [] });
      return;
    }

    const total = Number(loans[loans.length - 1].total) || 0;

    const flattenedLoans = loans.map((loan) => ({
      _id: loan._id,
      productId: loan.productId?._id || null,
      productName: loan.productId?.productName || null,
      productQuantity: loan.productId?.quantity || null,
      customerId: loan.customerId?._id || null,
      customerName: (loan.customerId as any)?.customerName || null,
      price: loan.price,
      total: loan.total,
      date: loan.date,
      status: loan.status,
      createdAt: loan.createdAt,
    }));

    res.status(200).json({
      total,
      loans: flattenedLoans,
    });
  } catch (e) {
    handleError(res, e);
  }
};


export const updateLoan = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ message: "Please provide ID!" });
      return;
    }

    const { productId, customerId, price, date, receivable} = req.body;
    const requiredFields = ["productId", "customerId", "price", "date"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ message: "Bad Request! Missing: " + missingFields.join(", ") });
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      res.status(400).json({ message: "Invalid price: must be a number" });
      return;
    }

    const existingLoan = await Loans.findById(id);
    if (!existingLoan) {
      res.status(404).json({ message: "Loan not found!" });
      return;
    }

    const oldCustomerId = String(existingLoan.customerId);
    const newCustomerId = String(customerId);

    const updatedLoan = await Loans.findByIdAndUpdate(
      id,
      { productId, customerId: newCustomerId, price: numericPrice, date, receivable },
      { new: true }
    );

    if (!updatedLoan) {
      res.status(500).json({ message: "Error updating loan." });
      return;
    }

    const recalcTotalsForCustomer = async (custId: string) => {
      const loans = await Loans.find({ customerId: custId, status: "Y" }).sort({ date: 1, _id: 1 });

      let runningTotal = 0;
      const bulkOps: any[] = [];

      for (const loan of loans) {
        const loanPrice = Number(loan.price) || 0;
        runningTotal += loanPrice;

        bulkOps.push({
          updateOne: {
            filter: { _id: loan._id },
            update: { $set: { total: runningTotal } },
          },
        });
      }

      if (bulkOps.length > 0) {
        await Loans.bulkWrite(bulkOps);
      }
    };

    if (oldCustomerId !== newCustomerId) {
      await recalcTotalsForCustomer(oldCustomerId);
    }

    await recalcTotalsForCustomer(newCustomerId);

    const finalLoan = await Loans.findById(id)
      .populate("productId")
      .populate("customerId")
      .lean();

    if (!finalLoan) {
      res.status(404).json({ message: "Updated loan not found after update!" });
      return;
    }

    const flattenedLoan = {
      _id: finalLoan._id,
      productId: finalLoan.productId?._id || null,
      productName: (finalLoan.productId as any)?.productName || null,
      productQuantity: (finalLoan.productId as any)?.quantity || null,
      customerId: finalLoan.customerId?._id || null,
      customerName: (finalLoan.customerId as any)?.customerName || null,
      price: finalLoan.price,
      receivable: finalLoan.receivable,
      total: finalLoan.total,
      date: finalLoan.date,
      status: finalLoan.status,
      createdAt: finalLoan.createdAt,
    };

    let total = flattenedLoan.total;

    res.status(200).json({total, receivable, loans: flattenedLoan});
  } catch (e) {
    handleError(res, e);
  }
};


export const deleteLoan = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ message: "Please provide the ID!" });
      return;
    }

    const loanToDelete = await Loans.findById(id);
    if (!loanToDelete) {
      res.status(404).json({ message: "Loan not found!" });
      return;
    }

    const customerId = String(loanToDelete.customerId);

    const deletedLoan = await Loans.findByIdAndUpdate(
      id,
      { $set: { status: "N" } },
      { new: true }
    );

    const activeLoans = await Loans.find({ customerId, status: "Y" }).sort({ date: 1, _id: 1 });

    let runningTotal = 0;
    const bulkOps: any[] = [];

    for (const loan of activeLoans) {
      const loanPrice = Number(loan.price) || 0;
      runningTotal += loanPrice;

      bulkOps.push({
        updateOne: {
          filter: { _id: loan._id },
          update: { $set: { total: runningTotal } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await Loans.bulkWrite(bulkOps);
    }

    const finalLoan = await Loans.findById(id)
      .populate("productId")
      .populate("customerId")
      .lean();

    if (!finalLoan) {
      res.status(404).json({ message: "Updated loan not found after update!" });
      return;
    }

    const flattenedLoan = {
      _id: finalLoan._id,
      productId: finalLoan.productId?._id || null,
      productName: (finalLoan.productId as any)?.productName || null,
      productQuantity: (finalLoan.productId as any)?.quantity || null,
      customerId: finalLoan.customerId?._id || null,
      customerName: (finalLoan.customerId as any)?.customerName || null,
      price: finalLoan.price,
      total: finalLoan.total,
      date: finalLoan.date,
      status: finalLoan.status,
      createdAt: finalLoan.createdAt,
    };

    res.status(200).json({...flattenedLoan});
  } catch (error) {
    handleError(res, error);
  }
};