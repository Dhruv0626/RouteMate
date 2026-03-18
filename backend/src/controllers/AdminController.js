import UserModel from "../models/UserModel.js";
import DriverProfileModel from "../models/DriverProfileModel.js";
import cacheService from "../utils/redis.js";

/**
 * Get core statistics for the admin dashboard
 * Provides: 
 * - Total User Counts (Users, Passengers, Drivers)
 * - Platform Health (Active/Online Drivers)
 * - Financial Overview (Estimated Revenue based on completed rides - demo logic for now)
 */
export const GetDashboardStats = async (req, res) => {
    try {
        // 🔐 Check Cache First
        const cacheKey = "admin:dashboard-stats";
        const cachedData = await cacheService.get(cacheKey);
        
        if (cachedData) {
            return res.status(200).json({
                success: true,
                stats: cachedData,
                source: "cache" // Trace metadata for verification
            });
        }

        // 1. User Counts
        const totalUsers = await UserModel.countDocuments();
        const passengers = await UserModel.countDocuments({ role: "passenger" });
        const drivers = await UserModel.countDocuments({ role: "driver" });
        const admins = await UserModel.countDocuments({ role: "admin" });

        // 2. Driver Specifics
        const approvedDrivers = await DriverProfileModel.countDocuments({ isApproved: true });
        const pendingDrivers = drivers - approvedDrivers;
        const onlineDrivers = await DriverProfileModel.countDocuments({ isOnline: true });

        // 3. Business metrics (Demo logic since we don't have a RideModel yet)
        const completionAggr = await DriverProfileModel.aggregate([
            { $group: { _id: null, totalCompleted: { $sum: "$completedRides" } } }
        ]);
        const totalCompletedRides = completionAggr[0]?.totalCompleted || 0;

        // Avg fare logic
        const estimatedRevenue = totalCompletedRides * 150;

        const stats = {
            counts: {
                total: totalUsers,
                passengers,
                drivers,
                admins
            },
            drivers: {
                approved: approvedDrivers,
                pending: pendingDrivers,
                online: onlineDrivers
            },
            business: {
                totalRides: totalCompletedRides,
                revenue: estimatedRevenue
            }
        };

        // 📥 Store in Cache for 5 minutes (300 seconds)
        await cacheService.set(cacheKey, stats, 300);

        return res.status(200).json({
            success: true,
            stats,
            source: "db" // Trace metadata for verification
        });

    } catch (error) {
        console.error("Admin Stats Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Get specific device/health analytics for Security/System pages
 */
export const GetSystemHealth = async (req, res) => {
    try {
        // Implementation for system status checks, CPU, memory, etc.
        // For now, return basic operational status
        return res.status(200).json({
            success: true,
            system: {
                status: "Operational",
                uptime: process.uptime(),
                version: "1.2.4-alpha",
                regions: ["Ahmedabad Central", "Ahmedabad North", "SG Highway"],
                latency: "24ms"
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
