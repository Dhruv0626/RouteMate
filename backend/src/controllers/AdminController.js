import UserModel from "../models/User.js";
import DriverProfileModel from "../models/DriverProfile.js";
import TripModel from "../models/Trip.js";
import ReviewModel from "../models/Review.js";
import cacheService from "../utils/redis.js";
import NotificationModel from "../models/Notification.js";
import PaymentModel from "../models/Payment.js";

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
            // 🔴 Always inject the LIVE socket count — never serve it from cache
            return res.status(200).json({
                success: true,
                stats: {
                    ...cachedData,
                    counts: {
                        ...cachedData.counts,
                        activeUsers: getActiveConnectionCount()
                    }
                },
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
            areaBreakdown,
            weeklyRidesStats
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
            
            // Revenue (Total platform fees from completed payments)
            PaymentModel.aggregate([
                { $match: { status: "completed" } },
                { $group: { _id: null, total: { $sum: "$platformFee" } } }
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
                { $limit: 2000 }, 
                { $group: { 
                    _id: {
                        $let: {
                            vars: { parts: { $split: ["$source.address", ","] } },
                            in: {
                                $concat: [
                                    { $ifNull: [{ $arrayElemAt: ["$$parts", 0] }, "Unknown"] },
                                    { $cond: [
                                        { $gt: [{ $size: "$$parts" }, 1] },
                                        { $concat: [", ", { $trim: { input: { $arrayElemAt: ["$$parts", 1] } } }] },
                                        ""
                                    ]}
                                ]
                            }
                        }
                    },
                    count: { $sum: 1 } 
                }},
                { $sort: { count: -1 } },
                { $limit: 6 }
            ]),

            // Weekly Rides Breakdown (Last 7 Days)
            TripModel.aggregate([
                { 
                    $match: { 
                        createdAt: { 
                            $gte: new Date(new Date().setDate(new Date().getDate() - 7)) 
                        } 
                    } 
                },
                { 
                    $group: { 
                        _id: { $dayOfWeek: "$createdAt" }, 
                        count: { $sum: 1 } 
                    } 
                }
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

        // Process Weekly Rides (Mongo: 1 = Sun, 2 = Mon ... 7 = Sat) -> UI: Mon to Sun (0-6)
        const weeklyRides = [0, 0, 0, 0, 0, 0, 0];
        weeklyRidesStats.forEach(stat => {
            const dayOfWeek = stat._id; // 1 to 7
            const uiIndex = dayOfWeek === 1 ? 6 : dayOfWeek - 2; // Map to 0-6 (Mon-Sun)
            if (uiIndex >= 0 && uiIndex <= 6) {
                weeklyRides[uiIndex] = stat.count;
            }
        });

        const stats = {
            counts: {
                total: totalUsers,
                passengers,
                drivers,
                activeUsers: getActiveConnectionCount(), // Always live — NOT cached
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
                totalReviews: ratingStats[0]?.total || 0,
                weeklyRides
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

        // Query: Get true system-wide audit logs
        const query = { 
            type: "audit"
        };
        
        // Potential future enhancement: filtering by category in metadata
        if (category) query["metadata.category"] = category;

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
                category: log.metadata?.category || "system",
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

/**
 * Get detailed revenue analytics day, time, and trip wise
 * Strictly counts platform fees from completed payments
 */
export const GetRevenueStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { status: "completed" };

        if (startDate && endDate) {
            query.createdAt = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        }

        const [dailyIncome, tripWiseIncome] = await Promise.all([
            // Day-wise grouping
            PaymentModel.aggregate([
                { $match: query },
                { $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalRevenue: { $sum: "$platformFee" },
                    tripCount: { $sum: 1 }
                }},
                { $sort: { _id: -1 } },
                { $limit: 30 }
            ]),
            // Detailed trip-wise list
            PaymentModel.find(query)
                .sort({ createdAt: -1 })
                .limit(100)
                .populate("driver", "name email")
                .populate("passenger", "name")
                .populate("trip", "source destination fare")
        ]);

        res.status(200).json({
            success: true,
            data: {
                dailyIncome,
                trips: tripWiseIncome.map(p => ({
                    id: p._id,
                    tripId: p.trip?._id,
                    date: p.createdAt,
                    passenger: p.passenger?.name || "Deleted User",
                    driver: p.driver?.name || "Deleted Driver",
                    totalFare: p.amount,
                    platformIncome: p.platformFee,
                    source: p.trip?.source?.address,
                    destination: p.trip?.destination?.address
                }))
            }
        });

    } catch (error) {
        console.error("Revenue Stats Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch revenue analytics." });
    }
};
