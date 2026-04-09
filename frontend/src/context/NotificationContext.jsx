import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Zap, TrendingUp, Heart, AlertCircle, CheckCircle, MessageCircle, Settings, Shield, Bell, Info, ShieldAlert, CheckSquare, Navigation, UserCheck } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { 
  getMyNotifications, 
  markAsRead as apiMarkAsRead, 
  markAllAsRead as apiMarkAllAsRead, 
  deleteNotification as apiDeleteNotification 
} from "../services/notificationService";
import socket from "../services/socket";

const ICONS = {
  ride_request: Zap,
  ride_update: Navigation, 
  account_update: UserCheck,
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

// Common notification sound URL (Standard ping)
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Refs to track previous state for change detection
  const prevUnreadCountRef = useRef(0);
  const audioRef = useRef(new Audio(NOTIFICATION_SOUND_URL));

  /**
   * Triggers a browser native notification with sound
   */
  const showNativeNotification = useCallback((notification) => {
    // Check App Settings Permission
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{"pushNotifs":false}');
    if (!appSettings.pushNotifs) return;

    // 1. Play Sound
    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {}); // Silent catch for browser policy
    } catch (err) {
      console.error("Sound playback error:", err.message);
    }

    // 2. Show System Notification (if permitted)
    if ("Notification" in window && Notification.permission === "granted") {
      const { title, message, type } = notification;
      
      const n = new Notification(title || "New Message", {
        body: message || "You have a new update in RouteMate.",
        icon: "/logo192.png", // Fallback to app icon if exists
        tag: notification._id, // Prevent duplicate notifications for same ID
        vibrate: [200, 100, 200]
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, []);

  // Request Notification Permission only if user has push notifications enabled in settings
  useEffect(() => {
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{"pushNotifs":false}');
    if (appSettings.pushNotifs && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      const { data } = await apiMarkAsRead(id);
      if (data.success) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        prevUnreadCountRef.current = newCount;
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error.message);
    }
  }, [unreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      const { data } = await apiMarkAllAsRead();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        prevUnreadCountRef.current = 0;
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error.message);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const { data } = await apiDeleteNotification(id);
      if (data.success) {
        setNotifications(prev => {
           const wasUnread = prev.find(n => n._id === id && !n.isRead);
           if (wasUnread) {
             const newCount = Math.max(0, unreadCount - 1);
             setUnreadCount(newCount);
             prevUnreadCountRef.current = newCount;
           }
           return prev.filter(n => n._id !== id);
        });
      }
    } catch (error) {
      console.error("Failed to delete notification:", error.message);
    }
  }, [unreadCount]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (!user) return;
    try {
      const { data } = await getMyNotifications();
      if (data.success) {
        const newNotifications = data.data.notifications;
        const newUnreadCount = data.data.unreadCount;

        // Detection Logic: If unread count increased, trigger an alert for the latest notification
        if (!isInitial && newUnreadCount > prevUnreadCountRef.current) {
          // Find the newest unread notification that wasn't previously known
          const latest = newNotifications.find(n => !n.isRead);
          if (latest) {
             showNativeNotification(latest);
             
             // Also show In-App Toast with DELETE action on close as requested
             showToast(latest.message, latest.type === 'error' ? 'error' : (latest.type === 'warning' ? 'warning' : 'info'), 8000, {
                 onDismiss: () => deleteNotification(latest._id)
             });
          }
        }

        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        prevUnreadCountRef.current = newUnreadCount;
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error.message);
    }
  }, [user, showNativeNotification, showToast, deleteNotification]);

  // Initial load, polling, and Socket connection
  useEffect(() => {
    if (user) {
      fetchNotifications(true);

      // ─── Socket.IO Real-time Connection ────────────────────────────────────
      socket.connect();
      socket.emit("join_user", user.id);

      const handleNewNotification = (notification) => {
        // Add to list and update count instantly
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        prevUnreadCountRef.current += 1;
        
        // Show native/toast immediate
        showNativeNotification(notification);
        showToast(notification.message, notification.type === 'error' ? 'error' : (notification.type === 'warning' ? 'warning' : 'info'), 8000, {
            onDismiss: () => deleteNotification(notification._id)
        });
      };

      socket.on("new_notification", handleNewNotification);

      // Polling every 30 seconds as a fallback (increased from 15 since socket is active)
      const pollInterval = setInterval(() => {
        fetchNotifications(false);
      }, 30000);

      return () => {
        clearInterval(pollInterval);
        socket.off("new_notification", handleNewNotification);
        socket.disconnect();
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadCountRef.current = 0;
      socket.disconnect();
    }
  }, [user, fetchNotifications, showNativeNotification, showToast, deleteNotification]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
    showNativeNotification // Exposed if we want to trigger manually
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
