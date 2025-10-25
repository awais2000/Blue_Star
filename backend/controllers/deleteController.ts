import express from "express";
import { handleError } from "../utils/errorHandler";
import Invoice from "../models/Invoice"
import Sales from "../models/Sales";
import SalesDetail from "../models/SalesDetail";
import TempProducts from "../models/tempProducts";
import Receivables from "../models/Receivable";


export const deleteRequest = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // 🧩 You can also use req.params.customerId if you prefer dynamic deletion
    const customerId = "68fd392f5f52a6ac97baa38c";

    if (!customerId) {
      res.status(400).json({ message: "Customer ID is required!" });
      return;
    }

    const deleted = await Receivables.deleteMany({ customerId });

    if (deleted.deletedCount === 0) {
      res.status(404).json({ message: "No receivables found for this customer." });
      return;
    }

    res.status(200).json({
      message: "Receivables deleted successfully!",
      deletedCount: deleted.deletedCount,
    });
  } catch (error) {
    handleError(res, error);
  }
};





export const resetCartData = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const deleted = await TempProducts.deleteMany({});

        res.status(200).send();
    }catch(error){
        handleError(res, error);
    }
}