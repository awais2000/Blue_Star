import pkg from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
const { v2: cloudinary } = pkg;
import type { ConfigOptions, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
} as ConfigOptions);

const storage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder: "skillmorph-files",
    resource_type: "auto",
  }),
});

const upload = multer({ storage });


const uploadPhoto = async (filePath, folder = 'vehicle_photos') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
    });
    return result; // result includes public_id, secure_url, etc.
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

const getPhotoUrl = (
  publicId: string,
  options: { width?: number; crop?: string; quality?: string } = {}
): string => {
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

const deleteFileFromCloudinary = async (
  urlOrPublicId: string
): Promise<UploadApiResponse | { result: string }> => {
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
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw error;
  }
};

export { upload, getPhotoUrl, uploadPhoto, deleteFileFromCloudinary };
