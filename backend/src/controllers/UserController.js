import UserModel from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ─── Token Helpers ────────────────────────────────────────────────────────────

/** Generate Access Token (1 hour for stability) */
const generateAccessToken = (user) =>
    jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

/** Generate long-lived Refresh Token (7 days for users, infinite for Admin) */
const generateRefreshToken = (user) => {
    const options = user.role === "admin" ? {} : { expiresIn: "7d" };
    return jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        options
    );
};

/** Hash a refresh token before storing in DB */
const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

/** Set secure HttpOnly cookies on the response */
const setTokenCookies = (res, accessToken, refreshToken, role) => {
    const isProduction = process.env.NODE_ENV === "production";

    // Admin refresh tokens stay forever (approx 100 years), others 7 days
    const refreshMaxAge = role === "admin"
        ? 100 * 365 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    res.cookie("accessToken", accessToken, {
        httpOnly: true,                  // Not accessible via JS (XSS protection)
        secure: isProduction,            // HTTPS only in production
        sameSite: isProduction ? "Strict" : "Lax", // CSRF protection
        maxAge: 60 * 60 * 1000           // 1 hour
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "Strict" : "Lax",
        path: "/api/users/refresh-token", // Only sent to refresh endpoint
        maxAge: refreshMaxAge
    });
};

// ─── Register ─────────────────────────────────────────────────────────────────
export const CreateUser = async (req, res) => {
    try {
        const { name, email, Mobile_no, password, role, secretKey } = req.body;
        // Note: Input validation is handled by ValidateMid.js middleware

        // 0. Admin Secret Key Check
        if (role === "admin") {
            if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid Secret Key. Admin registration denied."
                });
            }
        }

        // 1. Check for duplicate user
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email or mobile number already exists."
            });
        }

        // 2. Hash password with bcrypt (cost factor 12)
        const hashedPassword = await bcrypt.hash(password, 12);

        // 3. Create user — role defaults to "passenger" unless explicitly set
        const user = await UserModel.create({
            name,
            email,
            Mobile_no,
            password: hashedPassword,
            role: role || "passenger"
        });

        // 4. Generate Tokens immediately after registration
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // 5. Store latest hashed refresh token in DB
        await UserModel.findByIdAndUpdate(user._id, {
            refreshToken: hashToken(refreshToken)
        });

        // 6. Set tokens as secure HttpOnly cookies
        setTokenCookies(res, accessToken, refreshToken, user.role);

        // 7. Exclude sensitive fields from response
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;

        return res.status(201).json({
            success: true,
            message: "User registered and signed in successfully",
            accessToken,
            user: userResponse
        });

    } catch (error) {
        console.error("Create User Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Sign In ──────────────────────────────────────────────────────────────────
export const SignInUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        // Note: Input validation is handled by ValidateMid.js middleware

        // 1. Find user by email
        const user = await UserModel.findOne({ email });
        if (!user) {
            // Generic message to prevent user enumeration
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // ROLE CHECK: Ensure user is logging in from the correct panel
        if (user.role !== role) {
            return res.status(403).json({
                success: false,
                message: `Unauthorized. This is the ${role} portal, but your account is registered as a ${user.role}.`
            });
        }

        // 2. Check if account is blocked
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Your account has been blocked. Contact support." });
        }

        // 3. Verify password with bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // 4. Generate Access Token (15 min) + Refresh Token (7 days)
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // 5. Store latest hashed refresh token in DB
        await UserModel.findByIdAndUpdate(user._id, {
            refreshToken: hashToken(refreshToken)
        });

        // 6. Set tokens as secure HttpOnly cookies
        setTokenCookies(res, accessToken, refreshToken, user.role);

        // 7. Return user info without sensitive fields
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;

        return res.status(200).json({
            success: true,
            message: "Sign in successful",
            accessToken,   // Also returned in body for API/mobile clients
            user: userResponse
        });

    } catch (error) {
        console.error("Sign In Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Refresh Token Rotation ───────────────────────────────────────────────────
export const RefreshToken = async (req, res) => {
    try {
        // Accept refresh token from HttpOnly cookie OR request body
        const incomingRefreshToken =
            req.cookies?.refreshToken || req.body?.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({ success: false, message: "Refresh token not provided." });
        }

        // 1. Verify the refresh token signature & expiry
        let decoded;
        try {
            decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
        }

        // 2. Find user and check if this hashed token exists in DB
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found." });
        }

        const hashedIncoming = hashToken(incomingRefreshToken);

        if (user.refreshToken !== hashedIncoming) {
            // Token reuse or old token detected — invalidate session
            await UserModel.findByIdAndUpdate(user._id, { refreshToken: null });
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token. Please sign in again."
            });
        }

        // 3. ROTATION: Issue new pair and update latest token
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await UserModel.findByIdAndUpdate(user._id, {
            refreshToken: hashToken(newRefreshToken)
        });

        // 4. Set new tokens as secure cookies
        setTokenCookies(res, newAccessToken, newRefreshToken, user.role);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error("Refresh Token Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const LogoutUser = async (req, res) => {
    try {
        const incomingRefreshToken =
            req.cookies?.refreshToken || req.body?.refreshToken;

        if (incomingRefreshToken) {
            // Remove this specific refresh token from DB
            const user = await UserModel.findById(req.user?._id);
            if (user) {
                await UserModel.findByIdAndUpdate(req.user?._id, { refreshToken: null });
            }
        }

        // Clear cookies
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken", { path: "/api/users/refresh-token" });

        return res.status(200).json({ success: true, message: "Signed out successfully." });

    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Delete User (Admin only) ─────────────────────────────────────────────────
/**
 * Permanently deletes a user from the database.
 * Nullifying the refreshToken before deletion ensures that:
 *   - The deleted user's next API call will return 401 "User not found"
 *   - The frontend interceptor will catch the 401 and force-log them out
 */
export const DeleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent admin from deleting themselves
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "Admins cannot delete their own account."
            });
        }

        // 1. Verify the target user exists
        const targetUser = await UserModel.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // 2. Invalidate the user's session by nullifying refresh token
        //    (their next request or token refresh will fail with 401)
        await UserModel.findByIdAndUpdate(userId, { refreshToken: null });

        // 3. Delete the user document
        await UserModel.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: `User "${targetUser.name}" has been permanently deleted.`
        });

    } catch (error) {
        console.error("Delete User Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Update User (Admin only) ─────────────────────────────────────────────────
/**
 * Updates user details like name, email, mobile_no, role, or block status.
 * If the user's block status is set to true, their refreshToken is nullified.
 */
export const UpdateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, Mobile_no, role, isBlocked } = req.body;

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // 1. If user is being blocked, invalidate their session
        if (isBlocked === true && user.isBlocked === false) {
            await UserModel.findByIdAndUpdate(userId, { refreshToken: null });
        }

        // 2. Update user fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (Mobile_no) user.Mobile_no = Mobile_no;
        if (role) user.role = role;
        if (typeof isBlocked === "boolean") user.isBlocked = isBlocked;

        await user.save();

        return res.status(200).json({
            success: true,
            message: `User "${user.name}" updated successfully.`,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                Mobile_no: user.Mobile_no,
                role: user.role,
                isBlocked: user.isBlocked
            }
        });

    } catch (error) {
        console.error("Update User Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Get All Users (Admin only) ───────────────────────────────────────────────
export const GetAllUsers = async (req, res) => {
    try {
        const detailedUsers = await UserModel.aggregate([
            {
                $lookup: {
                    from: "driverprofiles",
                    localField: "_id",
                    foreignField: "user",
                    as: "driverProfile"
                }
            },
            {
                $unwind: {
                    path: "$driverProfile",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    password: 0,
                    refreshToken: 0
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        return res.status(200).json({ success: true, users: detailedUsers });
    } catch (error) {
        console.error("Get All Users Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Get Profile (RBAC example) ───────────────────────────────────────────────
export const GetProfile = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user._id).select("-password -refreshToken");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};