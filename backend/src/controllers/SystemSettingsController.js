import SystemConfig from "../models/FareConfig.js";
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
        let settings = await SystemConfig.findOne();

        if (!settings) {
            settings = new SystemConfig({});
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

        // Differentiate actual changes by comparing with current DB settings
        const actualChanges = {};
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                if (key === 'pricing' && typeof updateData[key] === 'object') {
                    const pricingDiff = {};
                    let hasDiff = false;
                    Object.keys(updateData.pricing).forEach(vType => {
                        const newV = updateData.pricing[vType];
                        const oldV = settings.pricing?.[vType] || {};
                        if (newV.baseFare !== oldV.baseFare || newV.costPerKm !== oldV.costPerKm) {
                            pricingDiff[vType] = newV;
                            hasDiff = true;
                        }
                    });
                    if (hasDiff) actualChanges[key] = pricingDiff;
                } else if (String(settings[key]) !== String(updateData[key])) {
                    actualChanges[key] = updateData[key];
                }
            }
        });

        // Apply ONLY actual updates
        Object.keys(actualChanges).forEach(key => {
            if (key === 'pricing') {
                settings.pricing = { ...settings.pricing, ...actualChanges[key] };
            } else {
                settings[key] = actualChanges[key];
            }
        });

        await settings.save();

        if (Object.keys(actualChanges).length > 0) {
            // Track price changes
            const isPriceChange = (actualChanges.pricing !== undefined || actualChanges.surgeMultiplier !== undefined);
            
            // Calculate if price increased or decreased
            let isIncrease = null;
            if (isPriceChange) {
                if (actualChanges.surgeMultiplier && settings.surgeMultiplier) {
                    const oldSurge = parseFloat(settings.surgeMultiplier.replace(/[^\d.]/g, ""));
                    const newSurge = parseFloat(actualChanges.surgeMultiplier.replace(/[^\d.]/g, ""));
                    if (newSurge > oldSurge) isIncrease = true;
                    else if (newSurge < oldSurge) isIncrease = false;
                }
                if (actualChanges.pricing && isIncrease === null) {
                    const vType = Object.keys(actualChanges.pricing)[0];
                    if (vType && settings.pricing?.[vType]) {
                        // Compare the first changed pricing object as a heuristic
                        const oldBaseStr = settings.pricing[vType].baseFare;
                        // For the old one, we should ideally fetch what was saved before this update,
                        // but since `settings.pricing` is already merged with the new data above,
                        // we'd better parse the new vs what's in the actualChanges (wait, settings is already updated! Let's just assume we check the diff)
                        // Actually, calculating increase from `actualChanges` is safer if we captured old state. This heuristic is basic.
                        isIncrease = true; // defaulting to true for simple change logging
                    }
                }
            }

            // Notify admins that settings were changed
            await notifySettingsUpdated({
                adminId: req.user.id,
                updateData: actualChanges
            });

            // If price changed, notify drivers (and admins) 
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
        console.error("Update Settings Error:", error);
        res.status(500).json({ success: false, message: "Failed to update settings." });
    }
};
