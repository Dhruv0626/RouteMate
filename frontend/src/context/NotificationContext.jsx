import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import {Zap, TrendingUp, Heart, AlertCircle, CheckCircle, MessageCircle, Settings, Shield, Bell, Info, ShieldAlert, CheckSquare, Navigation, UserCheck } from "lucide-react";
import { useAuth } from "./AuthContext";
import { 
  getMyNotifications, 
  markAsRead as apiMarkAsRead, 
  markAllAsRead as apiMarkAllAsRead, 
  deleteNotification as apiDeleteNotification 
} from "../services/notificationService";

const ICONS = {
  ride_request: Zap,
  ride_update: Navigation, // Check if Navigation is imported or use MapPin
  account_update: UserCheck, // Check imports
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: ShieldAlert,
  system: Settings
};
const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await getMyNotifications();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [user]);

  // Initial load and polling
  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Polling every 30 seconds for a "real-time" feel without WebSockets
      const pollInterval = setInterval(() => {
        fetchNotifications();
      }, 30000);

      return () => clearInterval(pollInterval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      const { data } = await apiMarkAsRead(id);
      if (data.success) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data } = await apiMarkAllAsRead();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const { data } = await apiDeleteNotification(id);
      if (data.success) {
        const wasUnread = notifications.find(n => n._id === id && !n.isRead);
        setNotifications(prev => prev.filter(n => n._id !== id));
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
