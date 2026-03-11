import React, { createContext, useContext, useState, useMemo } from "react";
import { Zap, TrendingUp, Heart, AlertCircle, CheckCircle, MessageCircle, Settings, Shield } from "lucide-react";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "ride-request",
      title: "New Ride Request",
      message: "Ride request from Sarah M. at Downtown Station",
      timestamp: "2 mins ago",
      read: false,
      priority: "high",
      icon: Zap,
      action: "Accept Ride",
      metadata: { passengerName: "Sarah M.", location: "Downtown Station" },
    },
    {
      id: 2,
      type: "earnings",
      title: "Daily Earnings Updated",
      message: "You earned ₹1,250 today from 8 completed rides",
      timestamp: "15 mins ago",
      read: false,
      priority: "medium",
      icon: TrendingUp,
      action: "View Earnings",
      metadata: { amount: "₹1,250", rides: 8 },
    },
    {
      id: 3,
      type: "rating",
      title: "New Rating Received",
      message: "John D. rated you 5.0 stars for your last ride",
      timestamp: "1 hour ago",
      read: true,
      priority: "low",
      icon: Heart,
      action: "View Ratings",
      metadata: { rating: 5.0, passenger: "John D." },
    },
    {
      id: 4,
      type: "alert",
      title: "Vehicle Maintenance Reminder",
      message: "Your vehicle is due for inspection. Schedule it soon.",
      timestamp: "3 hours ago",
      read: true,
      priority: "medium",
      icon: AlertCircle,
      action: "View Alert",
      metadata: { daysUntilDue: 5 },
    },
    {
      id: 5,
      type: "approval",
      title: "Document Verification",
      message: "Your license document has been verified successfully",
      timestamp: "5 hours ago",
      read: true,
      priority: "medium",
      icon: CheckCircle,
      action: "View Profile",
      metadata: { document: "Driver License" },
    },
    {
      id: 6,
      type: "message",
      title: "Support Message",
      message: "Support team replied to your ticket #12345",
      timestamp: "8 hours ago",
      read: true,
      priority: "low",
      icon: MessageCircle,
      action: "Reply Now",
      metadata: { ticketId: "#12345" },
    },
    {
      id: 7,
      type: "system",
      title: "Platform Update",
      message: "New features available in the app. Update now!",
      timestamp: "1 day ago",
      read: true,
      priority: "low",
      icon: Settings,
      action: "Check Update",
      metadata: { version: "2.1" },
    },
    {
      id: 8,
      type: "security",
      title: "Login Activity",
      message: "New login detected from Chrome on Windows",
      timestamp: "2 days ago",
      read: true,
      priority: "medium",
      icon: Shield,
      action: "Review Now",
      metadata: { device: "Chrome on Windows" },
    },
  ]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
