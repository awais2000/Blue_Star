import express from "express";
import mongoose from "mongoose";
import Loans from "../models/Loans";
import { handleError } from "../utils/errorHandler";
import { IProducts } from "../models/Products";

export const addLoan = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { productName, customerId, price, quantity, date } = req.body;

    const requiredFields = ["productName", "customerId", "price", "date", "quantity"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).send(`${missingFields.join(", ")} is required`);
      return;
    }

    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    if (isNaN(numericPrice) || isNaN(numericQuantity)) {
      res.status(400).send("Invalid price or quantity: both must be numbers");
      return;
    }

    const loanTotal = numericPrice * numericQuantity;

    const anotherTotal  = numericPrice * numericQuantity;

    const customerLoans = await Loans.find({ status: "Y", customerId });

    const overallTotal =
    customerLoans.reduce(
        (sum, loan) => sum + (Number(loan.price) * (Number(loan.quantity) || 1)),
        0
    ) + loanTotal;

    const newLoan = await Loans.create({
    productName,
    customerId,
    price: anotherTotal,          // per-unit price
    quantity: numericQuantity,    // number of units
    date,
    loanTotal,                    // total for this product
    total: overallTotal,          // cumulative total for all loans
    status: "Y",
    });


    const populatedLoan = await Loans.findById(newLoan._id)
      .populate({
        path: "customerId",
        match: { status: "Y" },
      })
      .lean();

    if (!populatedLoan) {
      res.status(500).json({ success: false, message: "Failed to fetch created loan" });
      return;
    }

    const flattenedLoan = {
        _id: populatedLoan._id,
        customerId: (populatedLoan.customerId as any)?._id || null,
        customerName: (populatedLoan.customerId as any)?.customerName || null,
        price: populatedLoan.price,          // per-unit price (20)
        quantity: populatedLoan.quantity,    // e.g., 4
        loanTotal: (Number(populatedLoan.price) * (Number(populatedLoan.quantity) || 1)),  // computed total for this loan
        receivable: populatedLoan.receivable ?? 0,
        total: populatedLoan.total,
        date: populatedLoan.date,
        status: populatedLoan.status,
        createdAt: populatedLoan.createdAt,
        };


    const existingReceivableSum = customerLoans.reduce(
      (sum, loan) => sum + (Number(loan.receivable) || 0),
      0
    );
    const newReceivable = Number(populatedLoan.receivable) || 0;
    const receivable = existingReceivableSum + newReceivable;

    res.status(200).json({
      total: overallTotal,
      receivable,
      loan: flattenedLoan,
    });

  } catch (e) {
    handleError(res, e);
  }
};


export const getLoanById = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params; // customerId

    const loans = await Loans.find({ status: "Y", customerId: id })
      .sort({ createdAt: 1 })
      .populate("customerId") // only works if schema uses ObjectId ref
      .lean();

    if (!loans || loans.length === 0) {
      res.status(200).json({
        message: "No loan details found!",
        total: 0,
        receivable: 0,
        loans: [],
      });
      return;
    }

    const total = Number(loans[loans.length - 1].total) || 0;

    const flattenedLoans = loans.map((loan) => {
      const customer =
        typeof loan.customerId === "object" ? loan.customerId : { _id: loan.customerId };

      return {
        _id: loan._id,
        productName: loan.productName || null,
        customerId: customer?._id || null,
        customerName: (customer as any)?.customerName || null,
        price: loan.price ?? 0,
        quantity: loan.quantity ?? 0, // ensure numeric
        receivable: loan.receivable ?? 0,
        total: loan.total ?? 0,
        date: loan.date,
        status: loan.status,
        createdAt: loan.createdAt,
      };
    });

    const receivable = flattenedLoans.reduce(
      (sum, loan) => sum + (Number(loan.receivable) || 0),
      0
    );

    res.status(200).json({
      total,
      receivable,
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

    const { productName, customerId, price, quantity, date, receivable } = req.body;

    const requiredFields = ["productName", "customerId", "price", "quantity", "date"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
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
    };

    const newPriceTotal = numericPrice * Number(quantity);

    const oldCustomerId = String(existingLoan.customerId);
    const newCustomerId = String(customerId);

    const updatedLoan = await Loans.findByIdAndUpdate(
      id,
      { productName, customerId: newCustomerId, price: newPriceTotal, quantity, date, receivable },
      { new: true }
    );

    if (!updatedLoan) {
      res.status(500).json({ message: "Error updating loan." });
      return;
    };

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
      };

      if (bulkOps.length > 0) {
        await Loans.bulkWrite(bulkOps);
      }
    };

    if (oldCustomerId !== newCustomerId) {
      await recalcTotalsForCustomer(oldCustomerId);
    }

    await recalcTotalsForCustomer(newCustomerId);

    const finalLoan = await Loans.findById(id).populate("customerId").lean();

    if (!finalLoan) {
      res.status(404).json({ message: "Updated loan not found after update!" });
      return;
    }

    const flattenedLoan = {
      _id: finalLoan._id,
      productName: finalLoan.productName || null,
      customerId: finalLoan.customerId?._id || null,
      customerName: (finalLoan.customerId as any)?.customerName || null,
      price: finalLoan.price,
      quantity: finalLoan.quantity,
      receivable: finalLoan.receivable,
      total: finalLoan.total,
      date: finalLoan.date,
      status: finalLoan.status,
      createdAt: finalLoan.createdAt,
    };

    const total = flattenedLoan.total ?? 0;

    res.status(200).json({
      message: "Loan updated successfully!",
      total,
      receivable: flattenedLoan.receivable ?? 0,
      loan: flattenedLoan,
    });
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
      .populate("customerId")
      .lean();

    if (!finalLoan) {
      res.status(404).json({ message: "Updated loan not found after update!" });
      return;
    }

    const flattenedLoan = {
      _id: finalLoan._id,
      productName: finalLoan.productName,
      quantity: finalLoan.quantity,
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