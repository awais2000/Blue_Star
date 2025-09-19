"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFileFromCloudinary = exports.uploadPhoto = exports.getPhotoUrl = exports.upload = void 0;
const cloudinary_1 = __importDefault(require("cloudinary"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const { v2: cloudinary } = cloudinary_1.default;
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
dotenv_1.default.config();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary,
    params: () => ({
        folder: "skillmorph-files",
        resource_type: "auto",
    }),
});
const upload = (0, multer_1.default)({ storage });
exports.upload = upload;
const uploadPhoto = async (filePath, folder = 'vehicle_photos') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: 'image',
        });
        return result; // result includes public_id, secure_url, etc.
    }
    catch (error) {
        console.error("Cloudinary upload error:", error);
        throw error;
    }
};
exports.uploadPhoto = uploadPhoto;
const getPhotoUrl = (publicId, options = {}) => {
    return cloudinary.url(publicId, {
        transformation: [
            {
                width: options.width ?? 400,
                crop: options.crop ?? "limit",
                quality: options.quality ?? "auto",
            },
        ],
        secure: true,
    });
};
exports.getPhotoUrl = getPhotoUrl;
const deleteFileFromCloudinary = async (urlOrPublicId) => {
    try {
        let publicId = urlOrPublicId;
        // If a full URL is passed, extract public_id
        if (urlOrPublicId.startsWith("http")) {
            const urlParts = urlOrPublicId.split("/");
            const filePath = urlParts.slice(-2).join("/"); // folder/filename.ext
            publicId = filePath.split(".")[0]; // remove extension
        }
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
        });
        return result;
    }
    catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        throw error;
    }
};
exports.deleteFileFromCloudinary = deleteFileFromCloudinary;
