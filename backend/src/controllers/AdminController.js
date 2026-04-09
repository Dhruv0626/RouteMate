import UserModel from "../models/User.js";
import DriverProfileModel from "../models/DriverProfile.js";
import TripModel from "../models/Trip.js";
import ReviewModel from "../models/Review.js";
import cacheService from "../utils/redis.js";
import NotificationModel from "../models/Notification.js";

import { getActiveConnectionCount } from "../utils/SocketManager.js";

/**
 * Get core statistics for the admin dashboard
 * Provides: 
 * - Total User Counts (Users, Passengers, Drivers)
 * - Platform Health (Active/Online Drivers)
 * - Financial Overview (Real Revenue from completed rides)
 * - Operational Metrics (Rides, Ratings, Vehicle distribution)
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
                source: "cache"
            });
        }

        // 1. Parallelize all core counts & aggregations
        const [
            totalUsers,
            passengers,
            drivers,
            approvedDrivers,
            onlineDrivers,
            tripStats,
            revenueStats,
            ratingStats,
            vehicleBreakdown,
            areaBreakdown
        ] = await Promise.all([
            UserModel.countDocuments(),
            UserModel.countDocuments({ role: "passenger" }),
            UserModel.countDocuments({ role: "driver" }),
            DriverProfileModel.countDocuments({ isApproved: true }),
            DriverProfileModel.countDocuments({ isOnline: true }),
            
            // Trip phase counts
            TripModel.aggregate([
                { $group: { _id: "$phase", count: { $sum: 1 } } }
            ]),
            
            // Revenue (Total of completed trips)
            TripModel.aggregate([
                { $match: { phase: "completed" } },
                { $group: { _id: null, total: { $sum: "$fare.total" } } }
            ]),

            // Avg Rating
            ReviewModel.aggregate([
                { $group: { _id: null, avg: { $avg: "$rating" }, total: { $sum: 1 } } }
            ]),

            // Vehicle Type Breakdown (from approved drivers)
            DriverProfileModel.aggregate([
                { $match: { isApproved: true } },
                { $group: { _id: "$vehicle.type", count: { $sum: 1 } } }
            ]),

            // Geographic Breakdown (Top 5 pickup areas based on source address)
            TripModel.aggregate([
                { $limit: 1000 }, // Optimization: sample recent 1000 trips
                { $group: { 
                    _id: { $arrayElemAt: [{ $split: ["$source.address", ","] }, -2] }, // Grab city/area part
                    count: { $sum: 1 } 
                }},
                { $sort: { count: -1 } },
                { $limit: 5 }
            ])
        ]);

        // Process Trip Stats
        const tripPhaseMap = tripStats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        const totalCompletedRides = tripPhaseMap.completed || 0;
        const totalCancelledRides = tripPhaseMap.cancelled || 0;
        const totalRides = tripStats.reduce((a, b) => a + b.count, 0);
        const cancellationRate = totalRides > 0 ? (totalCancelledRides / totalRides) * 100 : 0;

        const activeUsersCount = getActiveConnectionCount();

        const stats = {
            counts: {
                total: totalUsers,
                passengers,
                drivers,
                activeUsers: activeUsersCount,
                online: onlineDrivers
            },
            drivers: {
                approved: approvedDrivers,
                pending: drivers - approvedDrivers,
                online: onlineDrivers,
                vehicleBreakdown: vehicleBreakdown.map(v => ({ 
                    label: v._id || "Unknown", 
                    value: v.count,
                    color: v._id === "Sedan" ? "primary" : (v._id === "SUV" ? "violet" : (v._id === "Auto" ? "amber" : "emerald"))
                }))
            },
            business: {
                totalRides: totalRides,
                completed: totalCompletedRides,
                cancelled: totalCancelledRides,
                cancellationRate: cancellationRate.toFixed(1) + "%",
                revenue: revenueStats[0]?.total || 0,
                avgRating: (ratingStats[0]?.avg || 0).toFixed(1) + " ★",
                totalReviews: ratingStats[0]?.total || 0
            },
            geographic: areaBreakdown.map((a, i) => ({
                label: a._id ? a._id.trim() : "Other Areas",
                value: a.count,
                color: ["primary", "emerald", "violet", "amber", "rose"][i] || "primary"
            }))
        };

        // 📥 Store in Cache for 5 minutes
        await cacheService.set(cacheKey, stats, 300);

        return res.status(200).json({
            success: true,
            stats,
            source: "db"
        });

    } catch (error) {
        console.error("Admin Stats Error:", error.message);
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

/**
 * Get audit logs for administrative actions
 * Fetches all platform-wide events and specifically admin-relevant notifications
 */
export const GetAuditLogs = async (req, res) => {
    try {
        const { limit = 50, page = 1, category } = req.query;
        const skip = (page - 1) * limit;

        // Query: Only get events that were sent to this admin (to ensure personalized view)
        // or system-wide notification-type events
        const query = { 
            recipient: req.user.id,
            type: "notification"
        };
        
        // Potential future enhancement: filtering by category in metadata
        // if (category) query["metadata.category"] = category;

        const total = await NotificationModel.countDocuments(query);
        const logs = await NotificationModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate("sender", "name role email")
            .populate("recipient", "name role");

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            logs: logs.map(log => ({
                id: log._id,
                action: log.title,
                actor: log.sender?.name || "System",
                actorRole: log.sender?.role || "Automated",
                target: log.link || "System Internal",
                date: log.createdAt,
                status: "success", // For now, since logs are generated on success
                category: log.metadata?.action ? "security" : (log.metadata?.profileId ? "driver" : "system"),
                urgent: log.metadata?.action === "blocked",
                details: log.message,
                metadata: log.metadata
            }))
        });

    } catch (error) {
        console.error("Audit Logs Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch audit logs." });
    }
};
