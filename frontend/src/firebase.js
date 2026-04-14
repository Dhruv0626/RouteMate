import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ─── New Firebase Project: routemate-aa712 ────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDRbAIAt7MfAqjtHgLJ3UDfMfNmeQf1fPU",
  authDomain: "routemate-aa712.firebaseapp.com",
  projectId: "routemate-aa712",
  storageBucket: "routemate-aa712.firebasestorage.app",
  messagingSenderId: "362096907157",
  appId: "1:362096907157:web:38c31934a7f02ff9f65c9c",
  measurementId: "G-W67CSWPBKS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

/**
 * Request permission for push notifications and get FCM Token
 * @returns {Promise<string|null>} FCM Token or null
 * 
 * ⚠️  IMPORTANT: You MUST update the vapidKey below!
 *     Go to: Firebase Console → routemate-aa712 → Project Settings
 *            → Cloud Messaging → Web configuration → Web Push certificates
 *            → Generate key pair → copy the Key pair value
 */
export const requestForToken = async () => {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null; // No VAPID key configured

    const currentToken = await getToken(messaging, { vapidKey });
    return currentToken || null;
  } catch {
    // Silently fallback — Socket.IO handles real-time notifications
    return null;
  }
};

/**
 * Handle foreground messages
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export default app;
