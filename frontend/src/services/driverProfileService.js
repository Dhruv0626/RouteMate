import api from "./api";

// ─── Driver Profile API Services ──────────────────────────────────────────────

/**
 * Create a new driver profile
 * @param {Object} profileData - Driver profile data
 * @returns {Promise} API response
 */
export const createDriverProfile = (profileData) => {
  return api.post("/driver-profiles", profileData);
};

/**
 * Get the authenticated user's driver profile
 * @returns {Promise} API response with driver profile data
 */
export const getMyDriverProfile = () => {
  return api.get("/driver-profiles/my-profile");
};

/**
 * Get a specific driver profile by ID
 * @param {string} profileId - Driver profile ID
 * @returns {Promise} API response with driver profile data
 */
export const getDriverProfileById = (profileId) => {
  return api.get(`/driver-profiles/${profileId}`);
};

/**
 * Update the authenticated user's driver profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise} API response
 */
export const updateDriverProfile = (profileData) => {
  return api.put("/driver-profiles/update", profileData);
};

/**
 * Update driver online/offline status
 * @param {boolean} isOnline - Online status
 * @returns {Promise} API response
 */
export const updateDriverStatus = (isOnline) => {
  return api.patch("/driver-profiles/status", { isOnline });
};

/**
 * Delete the authenticated user's driver profile
 * @returns {Promise} API response
 */
export const deleteDriverProfile = () => {
  return api.delete("/driver-profiles");
};

/**
 * Get all driver profiles (Admin only)
 * @param {Object} options - Query options (isApproved, isOnline, limit, skip)
 * @returns {Promise} API response with paginated driver profiles
 */
export const getAllDriverProfiles = (options = {}) => {
  const { isApproved, isOnline, limit = 10, skip = 0 } = options;
  const params = new URLSearchParams();

  if (isApproved !== undefined) params.append("isApproved", isApproved);
  if (isOnline !== undefined) params.append("isOnline", isOnline);
  params.append("limit", limit);
  params.append("skip", skip);

  return api.get(`/driver-profiles/admin/all-drivers?${params.toString()}`);
};

/**
 * Approve or reject a driver profile (Admin only)
 * @param {string} profileId - Driver profile ID
 * @param {boolean} isApproved - Approval status
 * @returns {Promise} API response
 */
export const approveDriverProfile = (profileId, isApproved) => {
  return api.patch(`/driver-profiles/admin/approve/${profileId}`, { isApproved });
};
