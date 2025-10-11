import { MongoClient, Db } from "mongodb";
import mongoose from "mongoose";

// const uri = process.env.MONGO_URI || "mongodb+srv://owaisansar00x_db_user:exspLSvFR42bPnhb@blue-star.j6jmfur.mongodb.net/?retryWrites=true&w=majority&appName=blue-star";
const dbName = "blue-star";

let db: Db;

export default async function connectDB(): Promise<void> {
  try {
    const uri = process.env.MONGO_URI
    await mongoose.connect(uri);
    console.log("MongoDB Connected (Mongoose)");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
}