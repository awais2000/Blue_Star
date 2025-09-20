"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = void 0;
const handleError = (res, error, statusCode = 500, message = "Internal Server Error") => {
    let errorMessage = message;
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    res.status(statusCode).json({
        success: false,
        message,
        error: errorMessage,
    });
};
exports.handleError = handleError;
