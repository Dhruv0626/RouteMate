import DriverProfileModel from "../models/DriverProfileModel.js";
import UserModel from "../models/UserModel.js";

// ─── Create Driver Profile ────────────────────────────────────────────────────
export const CreateDriverProfile = async (req, res) => {
    try {
        const { licenseNumber, aadharNumber, vehicleType, vehicleName, vehicleNumber } = req.body;
        const userId = req.user.id;

        // Check if driver profile already exists for this user
        const existingProfile = await DriverProfileModel.findOne({ user: userId });
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Driver profile already exists for this user."
            });
        }

        // Create new driver profile
        const driverProfile = await DriverProfileModel.create({
            user: userId,
            licenseNumber,
            aadharNumber,
            vehicleType,
            vehicleName,
            vehicleNumber,
            isApproved: false,
            isOnline: false
        });

        // Update user role to driver if not already
        await UserModel.findByIdAndUpdate(userId, { role: "driver" });

        res.status(201).json({
            success: true,
            message: "Driver profile created successfully.",
            data: driverProfile
        });
    } catch (error) {
        console.error("Create Driver Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create driver profile.",
            error: error.message
        });
    }
};

// ─── Get Driver Profile by User ID ────────────────────────────────────────────
export const GetDriverProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const driverProfile = await DriverProfileModel.findOne({ user: userId }).populate("user", "name email Mobile_no");

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Driver profile retrieved successfully.",
            data: driverProfile
        });
    } catch (error) {
        console.error("Get Driver Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve driver profile.",
            error: error.message
        });
    }
};

// ─── Get Driver Profile by ID ─────────────────────────────────────────────────
export const GetDriverProfileById = async (req, res) => {
    try {
        const { id } = req.params;

        const driverProfile = await DriverProfileModel.findById(id).populate("user", "name email Mobile_no");

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Driver profile retrieved successfully.",
            data: driverProfile
        });
    } catch (error) {
        console.error("Get Driver Profile By ID Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve driver profile.",
            error: error.message
        });
    }
};

// ─── Update Driver Profile ────────────────────────────────────────────────────
export const UpdateDriverProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { licenseNumber, aadharNumber, vehicleType, vehicleName, vehicleNumber, currentLocation } = req.body;

        // Build update object with only provided fields
        const updateData = {};
        if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
        if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber;
        if (vehicleType !== undefined) updateData.vehicleType = vehicleType;
        if (vehicleName !== undefined) updateData.vehicleName = vehicleName;
        if (vehicleNumber !== undefined) updateData.vehicleNumber = vehicleNumber;
        if (currentLocation !== undefined) updateData.currentLocation = currentLocation;

        const driverProfile = await DriverProfileModel.findOneAndUpdate(
            { user: userId },
            updateData,
            { new: true, runValidators: true }
        ).populate("user", "name email Mobile_no");

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Driver profile updated successfully.",
            data: driverProfile
        });
    } catch (error) {
        console.error("Update Driver Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update driver profile.",
            error: error.message
        });
    }
};

// ─── Update Driver Status (Online/Offline) ────────────────────────────────────
export const UpdateDriverStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { isOnline } = req.body;

        if (typeof isOnline !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isOnline must be a boolean value."
            });
        }

        const driverProfile = await DriverProfileModel.findOneAndUpdate(
            { user: userId },
            { isOnline },
            { new: true }
        ).populate("user", "name email Mobile_no");

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        res.status(200).json({
            success: true,
            message: `Driver status updated to ${isOnline ? "online" : "offline"}.`,
            data: driverProfile
        });
    } catch (error) {
        console.error("Update Driver Status Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update driver status.",
            error: error.message
        });
    }
};

// ─── Delete Driver Profile ────────────────────────────────────────────────────
export const DeleteDriverProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const driverProfile = await DriverProfileModel.findOneAndDelete({ user: userId });

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        // Update user role back to passenger
        await UserModel.findByIdAndUpdate(userId, { role: "passenger" });

        res.status(200).json({
            success: true,
            message: "Driver profile deleted successfully."
        });
    } catch (error) {
        console.error("Delete Driver Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete driver profile.",
            error: error.message
        });
    }
};

// ─── Get All Driver Profiles (Admin Only) ──────────────────────────────────────
export const GetAllDriverProfiles = async (req, res) => {
    try {
        const { isApproved, isOnline, limit = 10, skip = 0 } = req.query;

        // Build filter object
        const filter = {};
        if (isApproved !== undefined) filter.isApproved = isApproved === "true";
        if (isOnline !== undefined) filter.isOnline = isOnline === "true";

        const driverProfiles = await DriverProfileModel.find(filter)
            .populate("user", "name email Mobile_no")
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort({ createdAt: -1 });

        const total = await DriverProfileModel.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: "Driver profiles retrieved successfully.",
            data: driverProfiles,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Get All Driver Profiles Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve driver profiles.",
            error: error.message
        });
    }
};

// ─── Approve/Reject Driver Profile (Admin Only) ────────────────────────────────
export const ApproveDriverProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { isApproved } = req.body;

        if (typeof isApproved !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isApproved must be a boolean value."
            });
        }

        const driverProfile = await DriverProfileModel.findByIdAndUpdate(
            id,
            { isApproved },
            { new: true, runValidators: true }
        ).populate("user", "name email Mobile_no");

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        res.status(200).json({
            success: true,
            message: `Driver profile ${isApproved ? "approved" : "rejected"} successfully.`,
            data: driverProfile
        });
    } catch (error) {
        console.error("Approve Driver Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update driver profile approval status.",
            error: error.message
        });
    }
};
