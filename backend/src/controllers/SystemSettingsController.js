import SystemConfig from "../models/SystemConfig.js";
import { notifySettingsUpdated, notifyPricingUpdated } from "../utils/NotifyUtil.js";

/**
 * Get current system settings
 */
export const GetSettings = async (req, res) => {
    try {
        let settings = await SystemConfig.findOne();
        if (!settings) {
            settings = await SystemConfig.create({});
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error("Get Settings Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to retrieve system settings. " + error.message });
    }
};

/**
 * Update system settings
 */
export const UpdateSettings = async (req, res) => {
    try {
        const updateData = req.body;
        let settings = await SystemConfig.findOne();

        if (!settings) {
            settings = new SystemConfig({});
        }

        // Function to ensure symbols are present
        const ensureSymbol = (val, prefix = "", suffix = "") => {
            if (val === undefined || val === null) return val;
            let str = String(val).trim();
            if (!str) return "0" + suffix; // Default if empty
            if (prefix && !str.startsWith(prefix)) str = prefix + str;
            if (suffix && !str.endsWith(suffix)) str = str + suffix;
            return str;
        };

        const actualChanges = {};

        // 1. Handle Top-level fields
        const topLevelFields = ['commission', 'surgeMultiplier', 'maxRadius', 'taxPercentage', 'realTimeTracking', 'autoApproveDrivers'];
        topLevelFields.forEach(key => {
            if (updateData[key] !== undefined) {
                let newVal = updateData[key];
                
                // Formatting
                if (key === 'commission') newVal = ensureSymbol(newVal, "", "%");
                if (key === 'surgeMultiplier') newVal = ensureSymbol(newVal, "", "x");
                if (key === 'maxRadius') newVal = ensureSymbol(newVal, "", "km");
                if (key === 'taxPercentage') newVal = parseFloat(newVal || "0");

                if (String(settings[key]) !== String(newVal)) {
                    actualChanges[key] = newVal;
                    settings[key] = newVal;
                }
            }
        });

        // 2. Handle Pricing (Nested)
        if (updateData.pricing && typeof updateData.pricing === 'object') {
            Object.keys(updateData.pricing).forEach(vType => {
                const newCategoryData = updateData.pricing[vType];
                if (!newCategoryData) return;

                // Ensure the category exists in settings
                if (!settings.pricing[vType]) {
                    settings.pricing[vType] = {
                        baseFare: "0", costPerKm: "0", perMinRate: "0", minFare: "0", nightCharge: "0", surgeCap: "1.8"
                    };
                }

                const catDiff = {};
                let catHasDiff = false;

                Object.keys(newCategoryData).forEach(field => {
                    let newVal = newCategoryData[field];
                    
                    // Formatting for specific pricing fields
                    if (field === 'baseFare' || field === 'costPerKm') {
                        newVal = ensureSymbol(newVal, "₹");
                    } else if (field === 'perMinRate' || field === 'minFare' || field === 'nightCharge') {
                        newVal = ensureSymbol(newVal, "₹");
                    }

                    if (String(settings.pricing[vType][field]) !== String(newVal)) {
                        catDiff[field] = newVal;
                        catHasDiff = true;
                        settings.pricing[vType][field] = newVal;
                    }
                });

                if (catHasDiff) {
                    if (!actualChanges.pricing) actualChanges.pricing = {};
                    actualChanges.pricing[vType] = catDiff;
                }
            });
            // Mark pricing as modified since it's a nested object
            settings.markModified('pricing');
        }

        // Handle Support & Social
        if (updateData.supportEmail) settings.supportEmail = updateData.supportEmail;
        if (updateData.contactNumber) settings.contactNumber = updateData.contactNumber;
        if (updateData.socialLinks) {
            settings.socialLinks = { ...settings.socialLinks, ...updateData.socialLinks };
            settings.markModified('socialLinks');
        }

        await settings.save();

        // ── Post-Save Notifications ──
        if (Object.keys(actualChanges).length > 0) {
            const isPriceChange = (actualChanges.pricing !== undefined || actualChanges.surgeMultiplier !== undefined);
            
            let isIncrease = null;
            if (isPriceChange) {
                // Heuristic for price change direction
                if (actualChanges.surgeMultiplier) {
                    const oldS = parseFloat(String(settings.surgeMultiplier).replace(/[^\d.]/g, "") || "1");
                    const newS = parseFloat(String(actualChanges.surgeMultiplier).replace(/[^\d.]/g, "") || "1");
                    if (newS > oldS) isIncrease = true;
                    else if (newS < oldS) isIncrease = false;
                }
                if (isIncrease === null) isIncrease = true; // Default to true if only pricing fields changed
            }

            // Notify admins
            await notifySettingsUpdated({
                adminId: req.user.id,
                updateData: actualChanges
            });

            // If price changed, notify drivers
            if (isPriceChange) {
                await notifyPricingUpdated({
                    adminId: req.user.id,
                    newPricing: settings.pricing,
                    surgeMultiplier: settings.surgeMultiplier,
                    isIncrease
                });
            }
        }

        res.status(200).json({ success: true, message: "Settings updated successfully.", settings });
    } catch (error) {
        console.error("Update Settings Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update settings: " + error.message });
    }
};
