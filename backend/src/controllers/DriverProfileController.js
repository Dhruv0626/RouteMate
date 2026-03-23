import DriverProfileModel from "../models/DriverProfileModel.js";
import UserModel from "../models/UserModel.js";
import NotificationModel from "../models/NotificationModel.js";
import { notifyDriverProfileSubmitted, notifyDriverApproved, notifyDriverRejected } from "../utils/NotifyUtil.js";

// ─── Create Driver Profile ────────────────────────────────────────────────────
export const CreateDriverProfile = async (req, res) => {
    try {
        const { vehicleType, vehicleName, licenseImage, aadharImage, vehicleImage, rcbookimage, insuranceimage } = req.body;
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
            vehicleType,
            vehicleName,
            licenseImage,
            aadharImage,
            vehicleImage,
            rcbookimage,
            insuranceimage,
            isApproved: false,
            isOnline: false
        });

        // Update user role to driver if not already
        const updatedUser = await UserModel.findByIdAndUpdate(userId, { role: "driver" }, { returnDocument: 'after' });

        // Notify admins + confirm to driver using the specific event function
        await notifyDriverProfileSubmitted({
            driver: updatedUser,
            profileId: driverProfile._id,
            adminId: null
        });

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
            return res.status(200).json({
                success: true,
                message: "Driver profile not found (user has not submitted it yet).",
                data: null
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
        const { vehicleType, vehicleName, currentLocation, licenseImage, aadharImage, vehicleImage, rcbookimage, insuranceimage } = req.body;

        // Build update object with only provided fields
        const updateData = {};
        if (vehicleType !== undefined) updateData.vehicleType = vehicleType;
        if (vehicleName !== undefined) updateData.vehicleName = vehicleName;
        if (currentLocation !== undefined) updateData.currentLocation = currentLocation;
        if (licenseImage !== undefined) updateData.licenseImage = licenseImage;
        if (aadharImage !== undefined) updateData.aadharImage = aadharImage;
        if (vehicleImage !== undefined) updateData.vehicleImage = vehicleImage;
        if (rcbookimage !== undefined) updateData.rcbookimage = rcbookimage;
        if (insuranceimage !== undefined) updateData.insuranceimage = insuranceimage;

        const driverProfile = await DriverProfileModel.findOneAndUpdate(
            { user: userId },
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        );

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        // Notify Admins if documents were updated
        const isDocumentUpdate = licenseImage || aadharImage || vehicleImage || rcbookimage || insuranceimage;
        if (isDocumentUpdate) {
            const admins = await UserModel.find({ role: "admin" });
            const adminNotifications = admins.map(admin => ({
                recipient: admin._id,
                sender: userId,
                title: "Driver Document Updated",
                message: `Driver ${req.user.name || 'User'} has updated their verification documents.`,
                type: "notification",
                link: "/admin/dashboard/driver-approvals",
                metadata: { driverId: userId, profileId: driverProfile._id }
            }));

            if (adminNotifications.length > 0) {
                await NotificationModel.insertMany(adminNotifications);
            }
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

        const driverProfile = await DriverProfileModel.findOne({ user: userId });

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        if (isOnline && !driverProfile.isApproved) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Your driver profile is pending admin approval."
            });
        }

        driverProfile.isOnline = isOnline;
        await driverProfile.save();

        const populatedProfile = await DriverProfileModel.findById(driverProfile._id).populate("user", "name email Mobile_no");


        res.status(200).json({
            success: true,
            message: `Driver status updated to ${isOnline ? "online" : "offline"}.`,
            data: populatedProfile
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
            { returnDocument: 'after', runValidators: true }
        ).populate("user", "name email Mobile_no");

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found."
            });
        }

        // Use dedicated, role-specific notification functions
        if (isApproved) {
            await notifyDriverApproved({
                driver: driverProfile.user,
                adminId: req.user.id,
                profileId: id
            });
        } else {
            await notifyDriverRejected({
                driver: driverProfile.user,
                adminId: req.user.id,
                profileId: id
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
