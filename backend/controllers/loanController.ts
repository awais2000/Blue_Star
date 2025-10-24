import express from "express";
import mongoose from "mongoose";
import Loans from "../models/Loans";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";


export const addLoan = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { productId, customerId, price, date } = req.body;

    const requiredFields = ["productId", "customerId", "price", "date"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).send(`${missingFields.join(", ")} is required`);
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      res.status(400).send("Invalid price: must be a number");
      return;
    }

    const customerLoans = await Loans.find({ status: "Y", customerId });
    const total =
      customerLoans.reduce((sum, loan) => sum + (Number(loan.price) || 0), 0) +
      numericPrice;

    const newLoan = await Loans.create({
      productId,
      customerId,
      price: numericPrice,
      date,
      total,
      status: "Y",
    });

    const populatedLoan = await Loans.findById(newLoan._id)
      .populate<{ productId: IProducts }>("productId")
      .populate("customerId")
      .lean();

    const flattenedLoan = {
      _id: populatedLoan._id,
      productId: populatedLoan.productId?._id || null,
      productName: populatedLoan.productId?.productName || null,
      productCategory: populatedLoan.productId?.quantity || null,
      customerId: (populatedLoan.customerId as any)?.customerName || null,
      price: populatedLoan.price,
      total: populatedLoan.total,
      date: populatedLoan.date,
      status: populatedLoan.status,
      createdAt: populatedLoan.createdAt,
    };

    res.status(200).json({...flattenedLoan});
  } catch (e) {
    handleError(res, e);
  }
};


export const getLoanById = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params; // this is customerId

    // ✅ 1. Fetch all active loans for this customer
    const loans = await Loans.find({ status: "Y", customerId: id })
      .sort({ createdAt: 1 })
      .populate<{ productId: IProducts }>("productId")
      .populate("customerId")
      .lean();

    // ✅ 2. Handle no results
    if (!loans || loans.length === 0) {
      res.status(200).json({ message: "No loan details found!", total: 0, loans: [] });
      return;
    }

    // ✅ 3. Determine total from last entry
    const total = Number(loans[loans.length - 1].total) || 0;

    // ✅ 4. Flatten each populated loan
    const flattenedLoans = loans.map((loan) => ({
      _id: loan._id,
      productId: loan.productId?._id || null,
      productName: loan.productId?.productName || null,
      productCategory: loan.productId?.quantity || null,
      customerId: loan.customerId?._id || null,
      customerName: (loan.customerId as any)?.customerName || null,
      price: loan.price,
      total: loan.total,
      date: loan.date,
      status: loan.status,
      createdAt: loan.createdAt,
    }));

    // ✅ 5. Send all flattened entries + separate total
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

    const { productId, customerId, price, date } = req.body;
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

    // Get the existing loan
    const existingLoan = await Loans.findById(id);
    if (!existingLoan) {
      res.status(404).json({ message: "Loan not found!" });
      return;
    }

    const oldCustomerId = String(existingLoan.customerId);
    const newCustomerId = String(customerId);

    // Update this specific loan
    const updatedLoan = await Loans.findByIdAndUpdate(
      id,
      { productId, customerId: newCustomerId, price: numericPrice, date },
      { new: true }
    );

    if (!updatedLoan) {
      res.status(500).json({ message: "Error updating loan." });
      return;
    };

    // Function to recalculate totals for a customer
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

    // Recalculate totals for old customer if customer changed
    if (oldCustomerId !== newCustomerId) {
      await recalcTotalsForCustomer(oldCustomerId);
    }

    // Always recalc totals for the new customer
    await recalcTotalsForCustomer(newCustomerId);

    // Send final updated record
    const finalLoan = await Loans.findById(id);
    res.status(200).json(finalLoan);
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

    res.status(200).json({
      message: "Loan deleted and totals updated successfully!",
      deletedLoan,
    });
  } catch (error) {
    handleError(res, error);
  }
};