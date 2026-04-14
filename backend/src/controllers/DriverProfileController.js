import DriverProfileModel from "../models/DriverProfile.js";
import UserModel from "../models/User.js";
import NotificationModel from "../models/Notification.js";
import PublishedRideModel from "../models/PublishedRide.js";
import { notifyDriverProfileSubmitted, notifyDriverApproved, notifyDriverRejected } from "../utils/NotifyUtil.js";

// ─── Create Driver Profile ────────────────────────────────────────────────────
export const CreateDriverProfile = async (req, res) => {
    try {
        const {
            licenseNumber, licenseExpiry, licenseImage,
            aadharNumber, aadharImage,
            vehicleName, vehicleType, vehicleNumber,
            rcBookImage, insuranceExpiry, insuranceImage, vehicleImage,
            bio
        } = req.body;

        // ─── Compulsory Field Validation ───────────────────────────────────
        const requiredFields = {
            licenseNumber, licenseExpiry, licenseImage,
            aadharNumber, aadharImage,
            vehicleName, vehicleType, vehicleNumber,
            rcBookImage, insuranceExpiry, insuranceImage, vehicleImage
        };

        const missingFields = Object.keys(requiredFields).filter(key => !requiredFields[key]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required driver profile details: ${missingFields.join(", ")}. All documents and vehicle info are compulsory.`
            });
        }
        
        const userId = req.user.id;

        // Check if driver profile already exists for this user
        const existingProfile = await DriverProfileModel.findOne({ user: userId });
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Driver profile already exists for this user."
            });
        }

        // Map flat fields to nested schema structure
        const driverProfileData = {
            user: userId,
            bio: bio || "",
            license: {
                number: licenseNumber || "",
                expiry: licenseExpiry || null,
                image: licenseImage || "", // Expected to be Cloudinary URL
            },
            aadhar: {
                number: aadharNumber || "",
                image: aadharImage || "", // Expected to be Cloudinary URL
            },
            vehicle: {
                name: vehicleName || "",
                type: vehicleType || "",
                number: vehicleNumber || "",
                rcBookImage: rcBookImage || "", // Cloudinary URL
                insuranceExpiry: insuranceExpiry || null,
                insuranceImage: insuranceImage || "", // Cloudinary URL
                vehicleImage: vehicleImage || "", // Cloudinary URL
            },
            isApproved: false,
            isOnline: false,
            currentLocation: { type: "Point", coordinates: [0, 0] }
        };

        const driverProfile = await DriverProfileModel.create(driverProfileData);

        // Update user role to driver if not already
        const updatedUser = await UserModel.findByIdAndUpdate(userId, { role: "driver" }, { returnDocument: 'after' });

        // Notify admins + confirm to driver
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
        console.error("Create Driver Profile Error:", error.message);
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
        const driverProfile = await DriverProfileModel.findOne({ user: userId }).populate("user", "name email Mobile_no profileImage");

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
        console.error("Get Driver Profile Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve driver profile.",
            error: error.message
        });
    }
};

// ─── Get Driver Profile by ID (Admin) ─────────────────────────────────────────
export const GetDriverProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const driverProfile = await DriverProfileModel.findById(id).populate("user", "name email Mobile_no profileImage");

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
        console.error("Get Driver Profile By ID Error:", error.message);
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
        const {
            licenseNumber, licenseExpiry, licenseImage,
            aadharNumber, aadharImage,
            vehicleName, vehicleType, vehicleNumber,
            rcBookImage, insuranceExpiry, insuranceImage, vehicleImage,
            bio, currentLocation
        } = req.body;

        const profile = await DriverProfileModel.findOne({ user: userId });
        if (!profile) {
            return res.status(404).json({ success: false, message: "Driver profile not found." });
        }

        // Apply updates manually to handle nested objects
        if (bio !== undefined) profile.bio = bio;
        if (currentLocation !== undefined) profile.currentLocation = currentLocation;

        // Nested Updates
        if (licenseNumber !== undefined) profile.license.number = licenseNumber;
        if (licenseExpiry !== undefined) profile.license.expiry = licenseExpiry;
        if (licenseImage !== undefined) profile.license.image = licenseImage;

        if (aadharNumber !== undefined) profile.aadhar.number = aadharNumber;
        if (aadharImage !== undefined) profile.aadhar.image = aadharImage;

        if (vehicleName !== undefined) profile.vehicle.name = vehicleName;
        if (vehicleType !== undefined) profile.vehicle.type = vehicleType;
        if (vehicleNumber !== undefined) profile.vehicle.number = vehicleNumber;
        if (rcBookImage !== undefined) profile.vehicle.rcBookImage = rcBookImage;
        if (insuranceExpiry !== undefined) profile.vehicle.insuranceExpiry = insuranceExpiry;
        if (insuranceImage !== undefined) profile.vehicle.insuranceImage = insuranceImage;
        if (vehicleImage !== undefined) profile.vehicle.vehicleImage = vehicleImage;

        await profile.save();

        // Notify Admins if sensitive documents were updated
        const isDocumentUpdate = licenseImage || aadharImage || vehicleImage || rcBookImage || insuranceImage;
        if (isDocumentUpdate) {
            const admins = await UserModel.find({ role: "admin" });
            const adminNotifications = admins.map(admin => ({
                recipient: admin._id,
                sender: userId,
                title: "Driver Document Updated",
                message: `Driver ${req.user.name || 'User'} has updated their verification documents.`,
                type: "notification",
                link: "/admin/dashboard/driver-approvals",
                metadata: { driverId: userId, profileId: profile._id }
            }));

            if (adminNotifications.length > 0) {
                await NotificationModel.insertMany(adminNotifications);
            }
        }

        res.status(200).json({
            success: true,
            message: "Driver profile updated successfully.",
            data: profile
        });
    } catch (error) {
        console.error("Update Driver Profile Error:", error.message);
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

        const populatedProfile = await DriverProfileModel.findById(driverProfile._id).populate("user", "name email Mobile_no profileImage");

        res.status(200).json({
            success: true,
            message: `Driver status updated to ${isOnline ? "online" : "offline"}.`,
            data: populatedProfile
        });
    } catch (error) {
        console.error("Update Driver Status Error:", error.message);
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
        console.error("Delete Driver Profile Error:", error.message);
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
            .populate("user", "name email Mobile_no profileImage")
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort({ createdAt: -1 });

        // ─── Attach Active Ride Info for Telematics ───
        const enriched = await Promise.all(driverProfiles.map(async (profile) => {
            const profileObj = profile.toObject();
            
            // Find NO.1: Any live ride (confirmed and in motion/pickup)
            const activeRide = await PublishedRideModel.findOne({ 
                driver: profile.user._id,
                status: { $in: ["active", "arrived", "in_progress"] }
            }).populate("bookings.passenger", "name");

            // Find NO.2: Any online ride (published but not yet active/accepted)
            const onlineRide = await PublishedRideModel.findOne({
                driver: profile.user._id,
                status: { $in: ["open", "full", "booked"] }
            });

            profileObj.activeRide = activeRide || null;
            profileObj.onlineRide = onlineRide || null;
            
            return profileObj;
        }));

        const total = await DriverProfileModel.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: "Driver profiles retrieved successfully.",
            data: enriched,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Get All Driver Profiles Error:", error.message);
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
            { isApproved, approvedAt: isApproved ? new Date() : null },
            { returnDocument: 'after', runValidators: true }
        ).populate("user", "name email Mobile_no profileImage");

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
            const { rejectionNote } = req.body;
            if (rejectionNote) {
                driverProfile.rejectionNote = rejectionNote;
                await driverProfile.save();
            }
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
        console.error("Approve Driver Profile Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to update driver profile approval status.",
            error: error.message
        });
    }
};
