import pkg from "express";
const express = pkg;
type Application = pkg.Application;
type Request = pkg.Request;
type Response = pkg.Response;
type NextFunction = pkg.NextFunction;
import jwt from "jsonwebtoken";

//  Define Custom User Type for Request
interface AuthenticatedRequest extends Request {
    user?: { email: string; role: string };
}

//  Fix: Ensure Proper `next()` Usage
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = req.header("Authorization");

    if (!token) {
        res.status(401).json({ status: 401, message: "Access Denied. No Token Provided." });
        return;
    }

    try {
        const decoded = jwt.verify(token, "your_secret_key") as { email: string; role: string };
        req.user = decoded; 
        next(); 
    } catch (error) {
        res.status(403).json({ status: 403, message: "Invalid Token" });
    }
};
