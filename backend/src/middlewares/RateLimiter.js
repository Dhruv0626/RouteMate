import rateLimit from "express-rate-limit";

// ─── General API Rate Limiter ────────────────────────────────────────────────
// Optimized for minimum server stability (Prevent memory/socket exhaustion)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,                 // max 1000 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Server is busy. Too many requests from this IP, please try again after 15 minutes."
    }
});

// ─── Auth Routes Rate Limiter (stricter) ─────────────────────────────────────
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // max 10 sign in/register attempts per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again after 15 minutes."
    }
});
