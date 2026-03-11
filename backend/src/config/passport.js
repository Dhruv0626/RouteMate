import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import UserModel from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// ─── Token Helpers ─────────────────────────────────────────────────────────────
const generateAccessToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

const generateRefreshToken = (user) => {
    const options = user.role === "admin" ? {} : { expiresIn: "7d" };
    return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, options);
};

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

// ─── Google Strategy ────────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/users/auth/google/callback",
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(null, false, { message: "No email found in Google profile" });

            // Role from query state (defaults to passenger)
            const role = req.query.state || "passenger";

            // Find or create user
            let user = await UserModel.findOne({ email });

            if (user) {
                // ── Role-gate: existing user must match the requested portal ──
                if (user.role !== role) {
                    return done(null, false, {
                        message: `role_mismatch:${user.role}:${role}`
                    });
                }
                return done(null, user);
            }

            // New user — create with Google info
            const name = profile.displayName || profile.name?.givenName || "Google User";
            user = await UserModel.create({
                name,
                email,
                Mobile_no: "0000000000",         // Placeholder — complete profile later
                password: hashToken(accessToken), // Unhashable — OAuth users can't use email/password
                role: role || "passenger",
                isGoogleAuth: true
            });

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// ─── Facebook Strategy ──────────────────────────────────────────────────────────
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || "http://localhost:5000/api/users/auth/facebook/callback",
        profileFields: ["id", "emails", "name", "displayName"],
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(null, false, { message: "No email found in Facebook profile. Please ensure your Facebook account has a public email." });

            const role = req.query.state || "passenger";

            let user = await UserModel.findOne({ email });

            if (user) {
                // ── Role-gate: existing user must match the requested portal ──
                if (user.role !== role) {
                    return done(null, false, {
                        message: `role_mismatch:${user.role}:${role}`
                    });
                }
                return done(null, user);
            }

            const name = profile.displayName || `${profile.name?.givenName} ${profile.name?.familyName}`.trim() || "Facebook User";
            user = await UserModel.create({
                name,
                email,
                Mobile_no: "0000000000",
                password: hashToken(accessToken),
                role: role || "passenger",
                isFacebookAuth: true
            });

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// ─── Serialize / Deserialize ────────────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ─── Helper: Issue Tokens After OAuth ──────────────────────────────────────────
export const issueOAuthTokens = async (user, res) => {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await UserModel.findByIdAndUpdate(user._id, { refreshToken: hashToken(refreshToken) });

    const isProduction = process.env.NODE_ENV === "production";
    const refreshMaxAge = user.role === "admin" ? 100 * 365 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "Strict" : "Lax",
        maxAge: 60 * 60 * 1000
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "Strict" : "Lax",
        path: "/api/users/refresh-token",
        maxAge: refreshMaxAge
    });

    return { accessToken, user };
};

export default passport;
