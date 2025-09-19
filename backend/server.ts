import pkg from "express";
const express = pkg;
type Application = pkg.Application;
type Request = pkg.Request;
type Response = pkg.Response;
type NextFunction = pkg.NextFunction;

import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import connectDB from "./config/db";
import  adminRoutes  from "./routes/adminRoutes";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is running!" });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// Connect DB, then start server
connectDB().then(() => {
  const server = http.createServer(app);

  app.get("/db-check", (req: Request, res: Response) => {
    res.json({ message: "Server & DB connected" });
  });

  adminRoutes(app);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});