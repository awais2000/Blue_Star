"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProduct = exports.updateProduct = exports.deleteProducts = exports.getProducts = exports.addProduct = void 0;
const Products_1 = __importDefault(require("../models/Products"));
const cloudinary = __importStar(require("cloudinary"));
const dotenv_1 = __importDefault(require("dotenv"));
const cloudinary_1 = require("../utils/cloudinary");
// const __dirname = path.dirname(__filename);
dotenv_1.default.config();
const addProduct = async (req, res) => {
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
        const { public_id } = await (0, cloudinary_1.uploadPhoto)(req.file.path, 'profile_pictures');
        imagePublicId = public_id;
        const newProduct = await Products_1.default.create({
            productName,
            quantity,
            price,
            image: imagePublicId ? JSON.stringify([imagePublicId]) : null,
        });
        res.status(201).send({ ...newProduct[0] });
    }
    catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send({ message: "Internal Server Error!", error: error.message });
    }
};
exports.addProduct = addProduct;
const getProducts = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10000000;
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const offset = (page - 1) * limit;
        const products = await Products_1.default.find({ status: "Y" })
            .sort({ productName: 1 })
            .skip(offset)
            .limit(limit)
            .lean();
        const processedProducts = products.map((product) => {
            let imageUrl = null;
            try {
                let publicId = null;
                if (Array.isArray(product.image)) {
                    publicId = product.image[0];
                }
                else if (typeof product.image === "string") {
                    if (product.image.startsWith("[")) {
                        const parsed = JSON.parse(product.image);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            publicId = parsed[0];
                        }
                    }
                    else {
                        publicId = product.image;
                    }
                }
                if (publicId) {
                    imageUrl = (0, cloudinary_1.getPhotoUrl)(publicId, {
                        width: 300,
                        crop: "fit",
                        quality: "auto",
                    });
                }
            }
            catch (err) {
                console.warn(`Error processing product image ${product._id}:`, err.message);
            }
            return {
                ...product,
                image: imageUrl,
            };
        });
        res.status(200).send(processedProducts);
    }
    catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send({ message: "Internal Server Error!", error: error.message });
    }
};
exports.getProducts = getProducts;
const deleteProducts = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            res.status(404).send({ message: "ID not found!" });
            return;
        }
        const deletedEntry = await Products_1.default.updateOne({ _id: id }, { $set: { status: "N" } });
        res.status(200).send({ ...deletedEntry[0] });
    }
    catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send({ message: "Internal Server Error!", error: error.message });
    }
};
exports.deleteProducts = deleteProducts;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { productName, quantity, price } = req.body;
        const existingProduct = await Products_1.default.findById(id);
        if (!existingProduct) {
            res.status(404).send({ message: "Product not found" });
            return;
        }
        const updateData = {};
        if (productName !== undefined)
            updateData.productName = productName;
        if (quantity !== undefined)
            updateData.quantity = quantity;
        if (price !== undefined)
            updateData.price = price;
        if (req.file) {
            try {
                if (existingProduct.image) {
                    try {
                        const imageData = JSON.parse(existingProduct.image);
                        if (imageData && imageData.length > 0) {
                            await cloudinary.v2.uploader.destroy(imageData[0]);
                        }
                    }
                    catch (error) {
                        console.warn("Error deleting old image from Cloudinary:", error);
                    }
                }
                const { public_id } = await (0, cloudinary_1.uploadPhoto)(req.file.path, 'products');
                updateData.image = JSON.stringify([public_id]);
            }
            catch (uploadError) {
                console.error("Error uploading new image:", uploadError);
                res.status(500).send({
                    message: "Error updating product image",
                    error: uploadError.message
                });
                return;
            }
        }
        const updatedProduct = await Products_1.default.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedProduct) {
            res.status(500).send({ message: "Failed to update product" });
            return;
        }
        res.status(200).send({
            message: "Product updated successfully",
            product: updatedProduct,
        });
    }
    catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send({
            message: "Internal Server Error!",
            error: error.message
        });
    }
};
exports.updateProduct = updateProduct;
const searchProduct = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            res.status(400).send({ message: "Search query is required." });
            return;
        }
        const searchTerm = new RegExp(search, 'i');
        const foundProducts = await Products_1.default.find({
            productName: { $regex: searchTerm }
        });
        if (foundProducts.length > 0) {
            res.status(200).send(foundProducts);
        }
        else {
            res.status(404).send({
                message: "No products found matching your search.",
                products: []
            });
        }
    }
    catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send({
            message: "Internal Server Error!",
            error: error.message
        });
    }
};
exports.searchProduct = searchProduct;
// export const getUploadedFile = async (req: express.Request, res: express.Response): Promise<void> => {
//   const filePath = path.join(__dirname, "addProduct.html");
//   res.sendFile(filePath);
// };
