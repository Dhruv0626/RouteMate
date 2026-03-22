import SettingsModel from "../models/SettingsModel.js";
import { notifyAdmins, notifyDrivers } from "../utils/NotifyUtil.js";

/**
 * Get current system settings
 */
export const GetSettings = async (req, res) => {
    try {
        let settings = await SettingsModel.findOne();
        if (!settings) {
            settings = await SettingsModel.create({});
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve settings." });
    }
};

/**
 * Update system settings
 */
export const UpdateSettings = async (req, res) => {
    try {
        const updateData = req.body;
        let settings = await SettingsModel.findOne();
        
        if (!settings) {
            settings = new SettingsModel({});
        }

        // Track price changes
        const isPriceChange = (updateData.pricing !== undefined || updateData.surgeMultiplier !== undefined);

        // Function to ensure symbols are present
        const ensureSymbol = (val, prefix = "", suffix = "") => {
            if (val === undefined || val === null) return val;
            let str = String(val).trim();
            if (prefix && !str.startsWith(prefix)) str = prefix + str;
            if (suffix && !str.endsWith(suffix)) str = str + suffix;
            return str;
        };

        // Format updateData before application
        if (updateData.pricing) {
            Object.keys(updateData.pricing).forEach(vType => {
                if (updateData.pricing[vType].baseFare) 
                    updateData.pricing[vType].baseFare = ensureSymbol(updateData.pricing[vType].baseFare, "₹");
                if (updateData.pricing[vType].costPerKm) 
                    updateData.pricing[vType].costPerKm = ensureSymbol(updateData.pricing[vType].costPerKm, "₹");
            });
        }
        if (updateData.commission) updateData.commission = ensureSymbol(updateData.commission, "", "%");
        if (updateData.surgeMultiplier) updateData.surgeMultiplier = ensureSymbol(updateData.surgeMultiplier, "", "x");
        if (updateData.maxRadius) updateData.maxRadius = ensureSymbol(updateData.maxRadius, "", "km");

        // Apply updates
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                // If it's a nested object like 'pricing', merge it or assign it
                if (key === 'pricing' && typeof updateData[key] === 'object') {
                    settings.pricing = { ...settings.pricing, ...updateData[key] };
                } else {
                    settings[key] = updateData[key];
                }
            }
        });

        await settings.save();

        // Notify Admins about the change
        await notifyAdmins({
            title: "System Settings Updated",
            message: `Admin ${req.user.name || 'User'} has updated system configuration.`,
            senderId: req.user.id,
            type: "notification",
            link: "/admin/dashboard/system-settings",
            metadata: { updates: Object.keys(updateData) }
        });

        // If price changed, notify ALL drivers
        if (isPriceChange) {
            await notifyDrivers({
                title: "Fare Rates Updated",
                message: `Attention Drivers: RouteMate has updated its fare structure for different vehicle categories. Check your dashboard for new rates.`,
                senderId: req.user.id,
                type: "notification",
                link: "/driver/dashboard",
                metadata: {
                    newPricing: settings.pricing,
                    surgeMultiplier: settings.surgeMultiplier
                }
            });
        }

        res.status(200).json({ success: true, message: "Settings updated successfully.", settings });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ success: false, message: "Failed to update settings." });
    }
};
