import { body, validationResult } from "express-validator";

// ─── Reusable validation result handler ──────────────────────────────────────
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};

// ─── Register Validation Rules ────────────────────────────────────────────────
export const validateRegister = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Valid email is required")
        .normalizeEmail(),

    body("Mobile_no")
        .trim()
        .notEmpty().withMessage("Mobile number is required")
        .matches(/^\d{10}$/).withMessage("Mobile number must be exactly 10 digits"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain at least one number"),

    handleValidationErrors
];

// ─── Sign In Validation Rules ──────────────────────────────────────────────────
export const validateSignIn = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Valid email is required")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required"),

    body("role")
        .notEmpty().withMessage("Sign in role is required")
        .isIn(["passenger", "driver", "admin"]).withMessage("Invalid sign in portal"),

    handleValidationErrors
];
