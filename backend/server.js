"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express = express_1.default;
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const db_1 = __importDefault(require("./config/db"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
dotenv_1.default.config();
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((0, cors_1.default)());
// Routes
app.get("/", (req, res) => {
    res.json({ message: "Server is running!" });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
});
// Connect DB, then start server
(0, db_1.default)().then(() => {
    const server = http_1.default.createServer(app);
    app.get("/db-check", (req, res) => {
        res.json({ message: "Server & DB connected" });
    });
    (0, adminRoutes_1.default)(app);
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
