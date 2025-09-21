"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.login = exports.addUser = void 0;
const express_1 = __importDefault(require("express"));
const express = express_1.default;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const addUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const requiredFields = ["name", "email", "password"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
            return;
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        const newUser = await User_1.default.create({
            name,
            email,
            password: hashedPassword,
        });
        res.status(201).json({
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
        });
    }
    catch (error) {
        console.error("AddUser Error:", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};
exports.addUser = addUser;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const requiredFields = ["email", "password"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
            return;
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ email: user.email, password: user.password }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(200).json({
            message: "Login successful",
            token,
            id: user._id,
            name: user.name,
            email: user.email,
        });
    }
    catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};
exports.login = login;
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, email, password } = req.body;
        const requiredFields = ["name", "email", "password"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
            return;
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        const updatedUser = await User_1.default.findByIdAndUpdate(id, {
            $set: {
                name,
                email,
                hashedPassword,
            },
        }, { new: true });
        if (!updatedUser) {
            res.status(404).json({ message: "User not found!" });
            return;
        }
        res.status(200).send({ message: "User Updated Success!",
            ...updatedUser.toObject(),
        });
    }
    catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};
exports.updateUser = updateUser;
