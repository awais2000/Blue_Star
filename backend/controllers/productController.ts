import express from "express";
import Product from "../models/Products";
import * as cloudinary from "cloudinary";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import { getPhotoUrl, uploadPhoto } from "../utils/cloudinary"


// const __dirname = path.dirname(__filename);

dotenv.config();

interface MulterRequest extends express.Request {
  file?: Express.Multer.File & { path: string };
}

type UploadApiResponse = cloudinary.UploadApiResponse;


export const addProduct = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { productName, quantity, price } = req.body;

    const requiredFields = ["productName", "quantity", "price"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).send({ message: `${missingFields.join(",")} required` });
      return;
    }

    if (!req.file) {
      res.status(400).send({ message: "Image is required" });
      return;
    }

    let imagePublicId = null;

    const { public_id } = await uploadPhoto(req.file.path, 'profile_pictures');

    imagePublicId = public_id;

    const newProduct = await Product.create({
      productName,
      quantity,
      price,
      image: imagePublicId ? JSON.stringify([imagePublicId]) : null,
    });

    res.status(201).send({ ...newProduct[0] });
    
  } catch (error: any) {
    console.error("Error adding product:", error);
    res.status(500).send({ message: "Internal Server Error!", error: error.message });
  }
};



export const getProducts = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const limit: number = req.query.limit ? parseInt(req.query.limit as string, 10) : 10000000;
    const page: number = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const offset: number = (page - 1) * limit;

    const products = await Product.find({ status: "Y" })
      .sort({ productName: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const processedProducts = products.map((product) => {
      let imageUrl: string | null = null;

      try {
        let publicId: string | null = null;

        if (Array.isArray(product.image)) {
          publicId = product.image[0];
        } else if (typeof product.image === "string") {
          if (product.image.startsWith("[")) {
            const parsed = JSON.parse(product.image);
            if (Array.isArray(parsed) && parsed.length > 0) {
              publicId = parsed[0];
            }
          } else {
            publicId = product.image;
          }
        }

        if (publicId) {
          imageUrl = getPhotoUrl(publicId, {
            width: 300,
            crop: "fit",
            quality: "auto",
          });
        }
      } catch (err: any) {
        console.warn(`Error processing product image ${product._id}:`, err.message);
      }

      return {
        ...product,
        image: imageUrl,
      };
    });

    res.status(200).send(processedProducts);

  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).send({ message: "Internal Server Error!", error: error.message });
  }
};



export const deleteProducts = async (req: express.Request, res: express.Response): Promise<void> => {
    try{
        const id = req.params.id;

        if(!id){
            res.status(404).send({message: "ID not found!"});
            return;
        }

        const deletedEntry = await Product.updateOne(
        { _id: id },
        { $set: { status: "N" } }
        );

        res.status(200).send({...deletedEntry[0]});

    } catch(error){
        console.error("Error fetching products:", error);
        res.status(500).send({ message: "Internal Server Error!", error: error.message });
    }
}




export const updateProduct = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { productName, quantity, price } = req.body;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      res.status(404).send({ message: "Product not found" });
      return;
    }

    const updateData: any = {};
    
    if (productName !== undefined) updateData.productName = productName;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (price !== undefined) updateData.price = price;

    if (req.file) {
      try {
        if (existingProduct.image) {
          try {
            const imageData = JSON.parse(existingProduct.image);
            if (imageData && imageData.length > 0) {
              await cloudinary.v2.uploader.destroy(imageData[0]);
            }
          } catch (error) {
            console.warn("Error deleting old image from Cloudinary:", error);
          }
        }

        const { public_id } = await uploadPhoto(req.file.path, 'products');
        updateData.image = JSON.stringify([public_id]);
        
      } catch (uploadError) {
        console.error("Error uploading new image:", uploadError);
        res.status(500).send({ 
          message: "Error updating product image", 
          error: uploadError.message 
        });
        return;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      res.status(500).send({ message: "Failed to update product" });
      return;
    }

    res.status(200).send({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error("Error updating product:", error);
    res.status(500).send({ 
      message: "Internal Server Error!", 
      error: error.message 
    });
  }
};



export const searchProduct = async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { search } = req.query;

    if (!search) {
      res.status(400).send({ message: "Search query is required." });
      return;
    }

    const searchTerm = new RegExp(search as string, 'i');

    const foundProducts = await Product.find({ 
      productName: { $regex: searchTerm } 
    });

    if (foundProducts.length > 0) {
      res.status(200).send(foundProducts);
    } else {
      res.status(404).send({
        message: "No products found matching your search.",
        products: []
      });
    }
    
  } catch(error: any) {
    console.error("Error fetching data:", error);
    res.status(500).send({ 
      message: "Internal Server Error!", 
      error: error.message 
    });
  }
};



// export const getUploadedFile = async (req: express.Request, res: express.Response): Promise<void> => {
//   const filePath = path.join(__dirname, "addProduct.html");
//   res.sendFile(filePath);
// };