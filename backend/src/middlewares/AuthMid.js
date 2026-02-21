import jwt from "jsonwebtoken";
import UserModel from "../models/UserModel.js";

/**
 * Auth Middleware — verifies JWT Access Token
 * Accepts token from:
 *   1. Authorization: Bearer <token>   (API clients)
 *   2. HttpOnly secure cookie          (browser clients)
 */
const authMiddleware = async (req, res, next) => {
    try {
        let token = null;

        // 1. Try Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        // 2. Fallback: try HttpOnly cookie
        if (!token && req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
        }

        // 3. Verify access token (short-lived)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Fetch user and check if blocked
        const user = await UserModel.findById(decoded.id).select("-password -refreshToken");
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
        }
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Forbidden: Your account has been blocked" });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Unauthorized: Access token expired. Please refresh." });
        }
        console.error("Authentication error:", error.message);
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }
};

export default authMiddleware;