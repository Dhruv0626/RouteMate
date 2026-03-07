import { useState, useCallback } from "react";
import {
  getMyDriverProfile,
  createDriverProfile,
  updateDriverProfile,
  updateDriverStatus,
  deleteDriverProfile,
  getDriverProfileById,
} from "../services/driverProfileService";

/**
 * Custom hook for managing driver profile state and operations
 * Follows the same pattern as useAuth for consistency
 */
export const useDriverProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch the current user's driver profile
   */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyDriverProfile();
      if (response.data.success) {
        setProfile(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch profile";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new driver profile
   */
  const createProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createDriverProfile(profileData);
      if (response.data.success) {
        setProfile(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create profile";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update the driver profile
   */
  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await updateDriverProfile(profileData);
      if (response.data.success) {
        setProfile(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update profile";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update driver online/offline status
   */
  const setOnlineStatus = useCallback(async (isOnline) => {
    setError(null);
    try {
      const response = await updateDriverStatus(isOnline);
      if (response.data.success) {
        setProfile(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update status";
      setError(errorMsg);
      throw err;
    }
  }, []);

  /**
   * Delete the driver profile
   */
  const deleteProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deleteDriverProfile();
      if (response.data.success) {
        setProfile(null);
        return response.data;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to delete profile";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a specific driver profile by ID (for viewing other driver profiles)
   */
  const getProfileById = useCallback(async (profileId) => {
    setError(null);
    try {
      const response = await getDriverProfileById(profileId);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch driver profile";
      setError(errorMsg);
      throw err;
    }
  }, []);

  /**
   * Clear profile and errors
   */
  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
  }, []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    createProfile,
    updateProfile,
    setOnlineStatus,
    deleteProfile,
    getProfileById,
    clearProfile,
    setError,
  };
};

export default useDriverProfile;
