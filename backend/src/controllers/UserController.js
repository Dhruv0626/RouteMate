import UserModel from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Helper function for user input validation
const validateUser = ({ name, email, Mobile_no, password }) => {
    if (!name || name.trim() === "") return "Name is required";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "Valid email is required";
    if (!Mobile_no || !/^\d{10}$/.test(Mobile_no)) return "Valid 10-digit mobile number is required";
    if (!password || password.length < 6) return "Password must be at least 6 characters long";
    return null;
};

export const CreateUser = async (req, res) => {
    try {
        const { name, email, Mobile_no, password, role } = req.body;

        // 1. Validate Fields
        const validationError = validateUser({ name, email, Mobile_no, password });
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        // 2. Check for Duplicate User (Email or Mobile)
        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists."
            });
        }

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create User
        // Role is optional: if provided in body, use it; otherwise default to "passenger"
        const user = await UserModel.create({
            name,
            email,
            Mobile_no,
            password: hashedPassword,
            role: role ? role : "passenger"
        });

        // 5. Exclude password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: userResponse
        });

    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

export const LoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and Password are required." });
        }

        // 1. Find User by Email ONLY
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // 2. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        // 3. Generate Token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "7d" }
        );

        // 4. Return user info without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: userResponse
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}