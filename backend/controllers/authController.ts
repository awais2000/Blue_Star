import pkg from "express";
const express = pkg;
type Request = pkg.Request;
type Response = pkg.Response;
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import User from "../models/User";
import dotenv from "dotenv";
dotenv.config();


export const addUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const requiredFields = ["name", "email", "password"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    });

  } catch (error: any) {
    console.error("AddUser Error:", error.message);
    res.status(500).json({ message: "Internal Server Error!" });
  }
};




export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const requiredFields = ["email", "password"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ message: `Missing: ${missingFields.join(", ")}` });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { email: user.email, password: user.password }, 
      process.env.JWT_SECRET,                          
      { expiresIn: "1h" }        
    );

    res.status(200).json({
      message: "Login successful",
      token,
      id: user._id,
      name: user.name,
      email: user.email,
    });

  } catch (error: any) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Internal Server Error!" });
  }
};