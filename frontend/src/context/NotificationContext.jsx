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
  system: Settings,
  trip_completed: CheckSquare
};

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

// ─── Notification Sound Setup ───
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; 
const notificationAudio = new Audio(NOTIFICATION_SOUND_URL);
notificationAudio.preload = "auto";
notificationAudio.loop = false; // CRITICAL: Ensure no continuous looping
notificationAudio.load();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Refs to track previous state for change detection
  const prevUnreadCountRef = useRef(0);

  /**
   * Triggers a browser native notification with sound
   */
  const showNativeNotification = useCallback((notification) => {
    // 1. Play Sound (Global - doesn't depend on native push settings)
    playChime(notification._id);

    // 2. Show System Notification (if permitted)
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{"pushNotifs":true}');
    if (!appSettings.pushNotifs) return;

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
    if (showNativeNotification && "Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      try {
        Notification.requestPermission().catch(() => {
          // silently catch browser anti-spam denial
        });
      } catch(e) {}
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
             setUnreadCount(prev => {
               const newCount = Math.max(0, prev - 1);
               prevUnreadCountRef.current = newCount;
               return newCount;
             });
           }
           return prev.filter(n => n._id !== id);
        });
      }
    } catch (error) {
      console.error("Failed to delete notification:", error.message);
    }
  }, []); // unreadCount removed from deps

  // ─── Mobile Audio Unlock ───
  // Unlocks the audio context on first user interaction 
  const unlockAudio = useCallback(() => {
    // Save original volume
    const originalVolume = notificationAudio.volume;
    notificationAudio.volume = 0; // Mute for unlock to prevent "ghost" blip
    
    notificationAudio.play().then(() => {
      notificationAudio.pause();
      notificationAudio.currentTime = 0;
      notificationAudio.volume = originalVolume || 0.5; // Restore volume
      console.log("🔊 Audio context unlocked silently");
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    }).catch(() => {
      notificationAudio.volume = originalVolume || 0.5;
    });
  }, []);

  useEffect(() => {
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, [unlockAudio]);

  // ─── Tone Trigger ───
  // Use a map to track recently played notification IDs to prevent duplicates
  const recentlyPlayedRef = useRef(new Set());

  const playChime = useCallback((notificationId = null) => {
    // 1. Deduplication check
    if (notificationId) {
      if (recentlyPlayedRef.current.has(notificationId)) return;
      recentlyPlayedRef.current.add(notificationId);
      // Keep set size manageable (last 50 IDs)
      if (recentlyPlayedRef.current.size > 50) {
        const first = recentlyPlayedRef.current.values().next().value;
        recentlyPlayedRef.current.delete(first);
      }
    }

    try {
      // Re-initialize for better mobile reliability
      notificationAudio.currentTime = 0;
      notificationAudio.volume = 0.5;
      notificationAudio.play().catch(err => {
        console.warn("Mobile chime blocked (interaction required):", err.message);
      });
    } catch (err) {}
  }, []);

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
             
             // UI Enhancement: Show toast with specific icon (Polling path)
             const ToastIcon = ICONS[latest.type] || Bell;
             showToast(latest.message, latest.type === 'error' ? 'error' : (latest.type === 'warning' ? 'warning' : 'info'), 8000, {
                 onDismiss: () => deleteNotification(latest._id),
                 icon: <ToastIcon size={18} />
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

  // Initial load, Socket connection, and fallback Polling
  useEffect(() => {
    if (user) {
      fetchNotifications(true);

      // ─── Instant Signal Path (Socket.IO) ───
      socket.connect();
      socket.emit("join_user", user._id || user.id);
      
      // If admin/superadmin, join the global admin room for real-time ride alerts
      if (user.role === "admin" || user.role === "superadmin") {
        socket.emit("join_admin", user._id || user.id);
      }

      const handleFastNotification = (notification) => {
        // Trigger tone and alert immediately (Socket path)
        showNativeNotification(notification);

        // Update state
        setNotifications(prev => {
          const exists = prev.find(n => n._id === notification._id || (n.createdAt === notification.createdAt && n.title === notification.title));
          if (exists) return prev;
          return [notification, ...prev];
        });
        
        setUnreadCount(prev => {
          const newCount = prev + 1;
          prevUnreadCountRef.current = newCount;
          return newCount;
        });

        // UI Enhancement: Show toast
        const ToastIcon = ICONS[notification.type] || Bell;
        showToast(notification.message, "info", 8000, {
          icon: <ToastIcon size={18} />
        });
      };

      socket.on("new_notification", handleFastNotification);

      // ─── Regular Fallback Path (Polling) ───
      const pollInterval = setInterval(() => {
        fetchNotifications(false);
      }, 15000);

      return () => {
        clearInterval(pollInterval);
        socket.off("new_notification", handleFastNotification);
        socket.disconnect();
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      socket.disconnect();
    }
  }, [user, fetchNotifications, showNativeNotification, showToast]);

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
