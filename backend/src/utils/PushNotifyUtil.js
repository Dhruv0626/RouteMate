import admin from "firebase-admin";
import dotenv from "dotenv";
import UserModel from "../models/User.js";

dotenv.config();

// ─── Initialize Firebase Admin ────────────────────────────────────────────────
// This will look for environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log("✅ Firebase Admin SDK Initialized");
  } else {
    console.warn("⚠️ Firebase Admin SDK NOT Initialized: Missing environment variables.");
  }
} catch (error) {
  console.error("❌ Firebase Admin Initialization Error:", error.message);
}

/**
 * Send a native push notification to a user's mobile status bar
 */
export const sendPushNotification = async (userId, notification) => {
  try {
    const user = await UserModel.findById(userId).select("fcmToken");
    
    if (!user || !user.fcmToken) {
      return; // No token, no push
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        link: notification.link || "",
        type: notification.type || "system",
        notificationId: notification._id.toString(),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          defaultSound: true,
          notificationPriority: "priorityHigh",
          visibility: "public",
          channelId: "high_priority_notifications" // Important for Android 8.0+
        },
      },
      token: user.fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log(`📲 Native status-bar notification sent to user ${userId}:`, response);
  } catch (error) {
    console.error(`❌ Push Notification Error for user ${userId}:`, error.message);
  }
};
