import UserModel from "../models/UserModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import { getEmailTemplate } from "../utils/emailTemplates.js";

export const ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
                errors: [{ field: "email", message: "Please provide a valid email address." }]
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Email not found",
                errors: [{ field: "email", message: "There is no account registered with this email." }]
            });
        }

        if (user.provider !== "local") {
            return res.status(400).json({ success: false, message: "Use social login instead." });
        }

        // Generate 6 digit OTP string
        const otpStr = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP and set expire (1 min)
        user.otp = {
            code: crypto.createHash("sha256").update(otpStr).digest("hex"),
            expiresAt: Date.now() + 10 * 60 * 1000,
            purpose: "reset"
        };

        await user.save({ validateBeforeSave: false });

        const htmlContent = getEmailTemplate({
            title: "Password Reset Request",
            message: "Verify your identity with the following OTP code to reset your password.",
            otp: otpStr,
            expiry: 10
        });

        try {
            await sendEmail({ email: user.email, subject: "RouteMate - OTP", html: htmlContent });
            res.status(200).json({ success: true, message: "OTP sent to your email." });
        } catch (emailErr) {
            user.otp = { code: null, expiresAt: null, purpose: null };
            await user.save({ validateBeforeSave: false });
            console.error("Email Error:", emailErr);
            return res.status(500).json({ success: false, message: "Email failure." });
        }
    } catch (generalErr) {
        console.error("Forgot PW Error:", generalErr);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

export const ResetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Missing input.",
                errors: [
                    ...(!email ? [{ field: "email", message: "Email is required." }] : []),
                    ...(!otp ? [{ field: "otp", message: "OTP is required." }] : []),
                    ...(!newPassword ? [{ field: "newPassword", message: "New password is required." }] : [])
                ]
            });
        }

        const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Verification failed",
                errors: [{ field: "email", message: "Email not found." }]
            });
        }

        if (
            user.otp.purpose !== "reset" ||
            user.otp.code !== hashedOtp || 
            user.otp.expiresAt < Date.now()
        ) {
            return res.status(400).json({
                success: false,
                message: "Verification failed",
                errors: [{ field: "otp", message: "Invalid or expired OTP code." }]
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Weak password",
                errors: [{ field: "newPassword", message: "Password must be at least 6 characters." }]
            });
        }

        if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Weak password",
                errors: [{ field: "newPassword", message: "Password must contain an uppercase letter and a number." }]
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.otp = { code: null, expiresAt: null, purpose: null };
        user.refreshToken = null;

        await user.save();
        res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (err) {
        console.error("Reset PW Error:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};
