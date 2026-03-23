import api from "./api";

/**
 * Fetch passenger trip history data from database
 * @param {object} params - { limit, status }
 */
export const getPassengerHistory = async (params = {}) => {
  return api.get("/rides/passenger-history", { params });
};

/**
 * Fetch driver ride history data from database
 * @param {object} params - { limit, status }
 */
export const getDriverHistory = async (params = {}) => {
  return api.get("/rides/driver-history", { params });
};

/**
 * Create a demo ride for testing (Development only)
 * @param {object} data - { targetUserId, role, status }
 */
export const createDemoRide = async (data) => {
  return api.post("/rides/create-demo", data);
};
