import UserModel from "../models/User.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import { getEmailTemplate, getAccountStatusTemplate } from "../utils/emailTemplates.js";
import cacheService from "../utils/redis.js";
import { notifyUserBlocked, notifyUserUnblocked, notifyUserDeleted } from "../utils/NotifyUtil.js";

// ─── Token Helpers ────────────────────────────────────────────────────────────

/** Generate Access Token (24 hours for stability and multi-device persistence) */
const generateAccessToken = (user) =>
    jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

/** Generate long-lived Refresh Token (30 days to ensure absolute persistence) */
const generateRefreshToken = (user) => {
    const options = user.role === "admin" ? {} : { expiresIn: "30d" };
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

    // Admin refresh tokens stay forever (approx 100 years), others 30 days
    const refreshMaxAge = role === "admin"
        ? 100 * 365 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    res.cookie("accessToken", accessToken, {
        httpOnly: true,                  // Not accessible via JS (XSS protection)
        secure: isProduction,            // HTTPS only in production
        sameSite: isProduction ? "none" : "Lax", // Cross-site required for public suffixes
        maxAge: 24 * 60 * 60 * 1000      // 24 hours
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "Lax",
        path: "/api/users/refresh-token", // Only sent to refresh endpoint
        maxAge: refreshMaxAge
    });
};

// ─── Register ─────────────────────────────────────────────────────────────────
export const CreateUser = async (req, res) => {
    try {
        const { name, email, Mobile_no, password, role, secretKey } = req.body;

        // 0. Admin Secret Key Check
        if (role === "admin") {
            if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid Secret Key. Admin registration denied."
                });
            }
        }

        // 1. Check for duplicate user PRIOR to registration attempt
        // Important: unverified users no longer exist in DB, so this only checks FINALIZED accounts
        const existingUser = await UserModel.findOne({ email }).lean();
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists."
            });
        }

        // 2. Hash password with bcrypt (cost factor 8)
        const hashedPassword = await bcrypt.hash(password, 8);

        // 3. Prepare OTP
        const otpStr = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins
        const hashedOtp = crypto.createHash("sha256").update(otpStr).digest("hex");

        // 4. Generate Registration Token (JWT)
        // This token contains ALL data required to create the account later.
        // It's signed with a 10-minute expiry to ensure security.
        const registrationData = {
            name,
            email,
            Mobile_no,
            password: hashedPassword,
            role: role || "passenger",
            otp: {
                code: hashedOtp,
                expiresAt: otpExpiry,
                purpose: "verification"
            }
        };

        const registrationToken = jwt.sign(
            registrationData,
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        );

        // 5. Send verification email
        const htmlContent = getEmailTemplate({
            title: "RouteMate Verification Required",
            message: `To complete your RouteMate ${registrationData.role} registration, use the following OTP code to verify your email address.`,
            otp: otpStr,
            expiry: 5
        });

        // Background send (eliminates wait time)
        sendEmail({
            email,
            subject: "RouteMate - Verify Your Email",
            html: htmlContent
        }).catch(err => console.error("Registration Email error:", err));

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email. Please verify to complete account creation.",
            needsVerification: true,
            registrationToken // Frontend will store this temporarily to send back with OTP
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "User with this email or mobile already exists." });
        }
        console.error("Create User Error:", error);
        return res.status(500).json({ success: false, message: "Server error during registration." });
    }
};

// ─── Sign In ──────────────────────────────────────────────────────────────────
export const SignInUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        // Note: Input validation is handled by ValidateMid.js middleware

        // 1. Find user by email (using .lean() for faster read)
        const user = await UserModel.findOne({ email }).lean();
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication failed. Please check your credentials and portal type."
            });
        }

        // ROLE CHECK: Ensure user is logging in from the correct panel
        // Admin portal allows both "admin" and "superadmin" roles
        const isAuthorized = user.role === role || (role === "admin" && user.role === "superadmin");

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: "Authentication failed. Please check your credentials and portal type."
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

        // 5. Store latest hashed refresh token in DB (Don't await to speed up response)
        UserModel.findByIdAndUpdate(user._id, {
            refreshToken: hashToken(refreshToken)
        }).catch(err => console.error("Background Token Update Error:", err));

        // 6. Set tokens as secure HttpOnly cookies
        setTokenCookies(res, accessToken, refreshToken, user.role);

        // 7. Return user info without sensitive fields
        const userResponse = { ...user };
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
        return res.status(500).json({
            success: false,
            message: "The authentication service is currently unavailable. Please try again later."
        });
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

                // 🧹 Invalidate Profile Cache on logout
                await cacheService.del(`user:profile:${req.user._id}`);
            }
        }

        // Clear cookies with the same flags they were set with to ensure they are removed
        const isProduction = process.env.NODE_ENV === "production";
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "Lax"
        };

        res.clearCookie("accessToken", cookieOptions);
        res.clearCookie("refreshToken", { ...cookieOptions, path: "/api/users/refresh-token" });

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

        // 🧹 Clear Redis Cache for this user
        await cacheService.del(`user:profile:${userId}`);
        await cacheService.del("admin:dashboard-stats"); // Update stats since user count changed

        // 3. Delete the user document
        await UserModel.findByIdAndDelete(userId);

        // Notify all admins about user deletion
        await notifyUserDeleted({
            targetUser,
            adminId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: `User "${targetUser.name}" has been permanently deleted.`
        });

    } catch (error) {
        console.error("Delete User Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Delete My Own Account (Self) ──────────────────────────────────────────────
export const DeleteUserForSelf = async (req, res) => {
    try {
        const userId = req.user.id; // From authMiddleware

        // 1. Verify user exists
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // 2. Invalidate session (logout logic)
        await UserModel.findByIdAndUpdate(userId, { refreshToken: null });

        // 🧹 Clear Redis Cache
        await cacheService.del(`user:profile:${userId}`);
        await cacheService.del("admin:dashboard-stats");

        // 3. Delete the user document
        await UserModel.findByIdAndDelete(userId);

        // Notify admins that a user deleted their own account
        await notifyUserDeleted({
            targetUser: user,
            adminId: null, // Self-initiated
            isSelfDelete: true
        });

        // 4. Clear cookies on response
        const isProduction = process.env.NODE_ENV === "production";
        res.clearCookie("accessToken", { httpOnly: true, secure: isProduction });
        res.clearCookie("refreshToken", { httpOnly: true, secure: isProduction, path: "/api/users/refresh-token" });

        return res.status(200).json({
            success: true,
            message: "Your RouteMate account has been permanently deleted."
        });

    } catch (error) {
        console.error("Delete Self Error:", error);
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
        const { name, email, Mobile_no, role, isBlocked, suspensionReason } = req.body;

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

        // Notify the target user AND all admins about the block/unblock action
        if (typeof isBlocked === "boolean") {
            if (isBlocked) {
                await notifyUserBlocked({ targetUser: user, adminId: req.user.id });
                // Send suspension email with reason
                const html = getAccountStatusTemplate({
                    userName: user.name,
                    type: "suspended",
                    reason: suspensionReason || "Violation of RouteMate Community Guidelines and Terms of Service."
                });
                sendEmail({ email: user.email, subject: "RouteMate - Your Account Has Been Suspended", html })
                    .catch(err => console.error("Suspension Email Error:", err));
            } else {
                await notifyUserUnblocked({ targetUser: user, adminId: req.user.id });
                // Send reinstatement email
                const html = getAccountStatusTemplate({
                    userName: user.name,
                    type: "reinstated",
                    reason: "Your appeal was reviewed and your account access has been restored."
                });
                sendEmail({ email: user.email, subject: "RouteMate - Your Account Has Been Reinstated", html })
                    .catch(err => console.error("Reinstatement Email Error:", err));
            }
        }

        // 🧹 Invalidate Profile Cache on update
        await cacheService.del(`user:profile:${userId}`);
        if (role) await cacheService.del("admin:dashboard-stats"); // Stats might change if role changed

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

// ─── Verify Email OTP & FINALIZE REGISTRATION ───────────────────────────────
export const VerifyEmailOTP = async (req, res) => {
    try {
        const { registrationToken, otp } = req.body;

        if (!registrationToken || !otp) {
            return res.status(400).json({ success: false, message: "Registration data and OTP are required." });
        }

        // 1. Decode registration token
        let decoded;
        try {
            decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Registration session expired. Please sign up again." });
        }

        // 2. Verify OTP
        const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
        if (
            decoded.otp.code !== hashedOtp ||
            decoded.otp.expiresAt < Date.now()
        ) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP code." });
        }

        // 3. CHECK DUPLICATE EMAIL
        const existing = await UserModel.findOne({ email: decoded.email });
        if (existing) {
            return res.status(409).json({ success: false, message: "User with this email was already registered." });
        }

        // 4. Generate unique referral code for this user
        const baseRef = decoded.name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "RMAT";
        let uniqueRefCode = baseRef + Math.floor(1000 + Math.random() * 9000);
        while (await UserModel.findOne({ referralCode: uniqueRefCode })) {
            uniqueRefCode = baseRef + Math.floor(1000 + Math.random() * 9000);
        }

        // 5. PERSIST USER TO DATABASE (First time storage!)
        const user = await UserModel.create({
            name: decoded.name,
            email: decoded.email,
            password: decoded.password, // Already hashed
            Mobile_no: decoded.Mobile_no,
            role: decoded.role,
            isVerified: true,
            referralCode: uniqueRefCode
        });

        // 🧹 Update cache for Admin dashboard stats
        await cacheService.del("admin:dashboard-stats");

        // 6. Sign in user immediately
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await UserModel.findByIdAndUpdate(user._id, {
            refreshToken: hashToken(refreshToken)
        });

        setTokenCookies(res, accessToken, refreshToken, user.role);

        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;

        return res.status(201).json({
            success: true,
            message: "Account verified and created successfully.",
            accessToken,
            user: userResponse
        });

    } catch (err) {
        console.error("Verify OTP Error:", err);
        return res.status(500).json({ success: false, message: "Failed to finalize registration." });
    }
};

// ─── Finalize OAuth Registration ───────────────────────────────────────────────
export const FinalizeOAuthRegistration = async (req, res) => {
    try {
        const { registrationToken, Mobile_no } = req.body;

        if (!registrationToken || !Mobile_no) {
            return res.status(400).json({ success: false, message: "Registration token and mobile number are required." });
        }

        // 1. Decode token
        let decoded;
        try {
            decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Signup session expired. Please try OAuth again." });
        }

        // 2. Prevent creating duplicate account
        const existing = await UserModel.findOne({ email: decoded.email });
        if (existing) {
            return res.status(409).json({ success: false, message: "User already registered." });
        }

        // 3. Create real user
        const user = await UserModel.create({
            name: decoded.name,
            email: decoded.email,
            password: decoded.password || crypto.randomBytes(16).toString("hex"),
            Mobile_no,
            role: decoded.role,
            provider: decoded.provider,
            profileImage: decoded.avatar || "",
            isVerified: true
        });

        // 🧹 Update cache
        await cacheService.del("admin:dashboard-stats");

        // 4. Issue session tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await UserModel.findByIdAndUpdate(user._id, {
            refreshToken: hashToken(refreshToken)
        });

        setTokenCookies(res, accessToken, refreshToken, user.role);

        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            accessToken,
            user: userResponse
        });

    } catch (err) {
        console.error("Finalize OAuth Error:", err);
        return res.status(500).json({ success: false, message: "Failed to finalize account." });
    }
};

// ─── Resend Verification OTP (Stateless) ──────────────────────────────────────
export const ResendVerificationOTP = async (req, res) => {
    try {
        const { registrationToken } = req.body;

        if (!registrationToken) {
            return res.status(400).json({ success: false, message: "Registration token is required." });
        }

        // 1. Decode current token to get user info
        let decoded;
        try {
            decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Session expired. Please sign up again." });
        }

        // 2. Generate NEW OTP
        const otpStr = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 5 * 60 * 1000;
        const hashedOtp = crypto.createHash("sha256").update(otpStr).digest("hex");

        // 3. Issue NEW Registration Token with updated OTP
        const newData = { ...decoded, otp: { code: hashedOtp, expiresAt: otpExpiry, purpose: "verification" } };
        const newRegistrationToken = jwt.sign(newData, process.env.JWT_SECRET, { expiresIn: "5m" });

        // 4. Send email
        const htmlContent = getEmailTemplate({
            title: "New Verification OTP",
            message: "To complete your registration, use the following new OTP code.",
            otp: otpStr,
            expiry: 5
        });

        sendEmail({ email: decoded.email, subject: "RouteMate - New OTP Code", html: htmlContent })
            .catch(err => console.error("Resend OTP Background Error:", err));

        res.status(200).json({
            success: true,
            message: "New verification OTP sent.",
            registrationToken: newRegistrationToken
        });

    } catch (error) {
        console.error("Resend OTP Error:", error.message);
        res.status(500).json({ success: false, message: "Server error during OTP resend." });
    }
};

/**
 * Update User Mobile Number
 */
export const UpdateMobileNumber = async (req, res) => {
    try {
        const { mobileNumber } = req.body;
        if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
            return res.status(400).json({ success: false, message: "Valid 10-digit mobile number is required." });
        }

        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        user.Mobile_no = mobileNumber;
        await user.save();

        // 🧹 Invalidate Profile Cache
        await cacheService.del(`user:profile:${user._id}`);

        const updatedUser = user.toObject();
        delete updatedUser.password;
        delete updatedUser.refreshToken;

        res.status(200).json({
            success: true,
            message: "Mobile number updated successfully.",
            user: updatedUser
        });
    } catch (error) {
        console.error("Update Mobile Error:", error.message);
        res.status(500).json({ success: false, message: "Server error while updating mobile number." });
    }
};

// ─── Get Profile (RBAC example) ───────────────────────────────────────────────
export const GetProfile = async (req, res) => {
    try {
        // 🔐 Check Cache First
        const cacheKey = `user:profile:${req.user._id}`;
        const cachedUser = await cacheService.get(cacheKey);

        if (cachedUser) {
            return res.status(200).json({
                success: true,
                user: cachedUser,
                source: "cache"
            });
        }

        const user = await UserModel.findById(req.user._id).select("-password -refreshToken").lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // 📥 Store in Cache for 10 minutes (600 seconds)
        await cacheService.set(cacheKey, user, 600);

        return res.status(200).json({
            success: true,
            user,
            source: "db"
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Update User Profile Image (Cloudinary)
 */
export const UpdateProfileImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: "Image URL is required." });
        }

        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        user.profileImage = imageUrl;
        await user.save();

        // 🧹 Invalidate Profile Cache
        await cacheService.del(`user:profile:${user._id}`);

        const updatedUser = user.toObject();
        delete updatedUser.password;
        delete updatedUser.refreshToken;

        res.status(200).json({
            success: true,
            message: "Profile image updated successfully.",
            profileImage: user.profileImage,
            user: updatedUser
        });
    } catch (error) {
        console.error("Update Profile Image Error:", error.message);
        res.status(500).json({ success: false, message: "Server error while updating profile image." });
    }
};

/**
 * Update User FCM Token for Push Notifications
 */
export const updateFCMToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ success: false, message: "FCM Token is required" });
        }

        await UserModel.findByIdAndUpdate(req.user.id, { fcmToken });
        res.json({ success: true, message: "FCM Token updated successfully" });
    } catch (error) {
        console.error("Update FCM Token Error:", error);
        res.status(500).json({ success: false, message: "Server error updating token" });
    }
};

/**
 * Apply Referral Code (Passenger First Trip)
 */
export const applyReferralCode = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        if (!code) {
            return res.status(400).json({ success: false, message: "Referral code is required." });
        }

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (user.role !== "passenger") {
            return res.status(400).json({ success: false, message: "Referrals only available for passengers." });
        }

        if ((user.passengerStats?.totalTrips || 0) > 0) {
            return res.status(400).json({ success: false, message: "Referral code can only be applied before your first trip." });
        }

        if (user.referredBy) {
            return res.status(400).json({ success: false, message: "You have already applied a referral code." });
        }

        const referrer = await UserModel.findOne({ referralCode: code.toUpperCase() });
        if (!referrer) {
            return res.status(400).json({ success: false, message: "Invalid referral code." });
        }

        if (referrer._id.toString() === userId.toString()) {
            return res.status(400).json({ success: false, message: "You cannot refer yourself." });
        }

        user.referredBy = referrer._id;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Referral code applied! You are referred by ${referrer.name}.`,
            referrerName: referrer.name
        });

    } catch (error) {
        console.error("Apply Referral Error:", error.message);
        res.status(500).json({ success: false, message: "Server error while applying referral code." });
    }
};

/**
 * Get User Referral Statistics
 */
export const GetReferralStats = async (req, res) => {
    try {
        const userId = req.user.id;
        let user = await UserModel.findById(userId).select("referralCode name");
        
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // ── Auto-generate code if missing (for legacy users) ──
        if (!user.referralCode) {
            const baseRef = user.name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "RMAT";
            let uniqueRefCode = baseRef + Math.floor(1000 + Math.random() * 9000);
            
            // Basic collision check
            let exists = await UserModel.findOne({ referralCode: uniqueRefCode });
            while (exists) {
                uniqueRefCode = baseRef + Math.floor(1000 + Math.random() * 9000);
                exists = await UserModel.findOne({ referralCode: uniqueRefCode });
            }
            
            user.referralCode = uniqueRefCode;
            await user.save();
        }

        // Count how many people joined using this code
        const joinedCount = await UserModel.countDocuments({ referredBy: userId });

        // Total earnings from referrals
        const WalletTransaction = mongoose.model("WalletTransaction");
        const walletTx = await WalletTransaction.find({ 
            user: userId, 
            reference: "referral" 
        });
        const totalEarned = walletTx.reduce((sum, tx) => sum + tx.amount, 0);

        // Get list of recent referrals (names and dates)
        const recentReferrals = await UserModel.find({ referredBy: userId })
            .select("name createdAt")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        res.status(200).json({
            success: true,
            data: {
                referralCode: user.referralCode,
                joinedCount,
                totalEarned,
                recentReferrals: recentReferrals.map(r => ({
                    name: r.name,
                    date: new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                }))
            }
        });
    } catch (error) {
        console.error("Get Referral Stats Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch referral statistics" });
    }
};
