"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
// const uri = process.env.MONGO_URI || "mongodb+srv://owaisansar00x_db_user:exspLSvFR42bPnhb@blue-star.j6jmfur.mongodb.net/?retryWrites=true&w=majority&appName=blue-star";
const dbName = "blue-star";
let db;
async function connectDB() {
    try {
        const uri = process.env.MONGO_URI || "mongodb+srv://owaisansar00x_db_user:exspLSvFR42bPnhb@blue-star.j6jmfur.mongodb.net/?retryWrites=true&w=majority&appName=blue-star";
        await mongoose_1.default.connect(uri);
        console.log("MongoDB Connected (Mongoose)");
    }
    catch (error) {
        console.error("MongoDB Connection Failed:", error);
        process.exit(1);
    }
}
