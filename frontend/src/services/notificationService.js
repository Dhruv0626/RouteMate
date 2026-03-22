import api from "./api";

/**
 * Fetch all notifications for the current user
 * @param {boolean} unreadOnly - Filter by unread status
 * @returns {Promise} API response
 */
export const getMyNotifications = (unreadOnly = false) => {
  return api.get(`/notifications?unreadOnly=${unreadOnly}`);
};

/**
 * Mark a specific notification as read
 * @param {string} id - Notification ID
 * @returns {Promise} API response
 */
export const markAsRead = (id) => {
  return api.patch(`/notifications/${id}/read`);
};

/**
 * Mark all notifications as read
 * @returns {Promise} API response
 */
export const markAllAsRead = () => {
  return api.patch("/notifications/read-all");
};

/**
 * Delete a specific notification
 * @param {string} id - Notification ID
 * @returns {Promise} API response
 */
export const deleteNotification = (id) => {
  return api.delete(`/notifications/${id}`);
};
