import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDCYwNptmf02BXe1iHs5ZJa6kvvaldrlqA",
  authDomain: "routemate-8c753.firebaseapp.com",
  projectId: "routemate-8c753",
  storageBucket: "routemate-8c753.firebasestorage.app",
  messagingSenderId: "481672405033",
  appId: "1:481672405033:web:73a1c22234838a2bfdfc38",
  measurementId: "G-8ZMWLJZER0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);

/**
 * Request permission for notifications and get FCM Token
 * @returns {Promise<string|null>} FCM Token
 */
export const requestForToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Get the token using the VAPID key
      // REPLACE 'YOUR_VAPID_KEY_HERE' with your actual VAPID key from Firebase Console
      // Settings -> Cloud Messaging -> Web configuration -> Web Push certificates
      const vapidKey = 'BM1oVrTY2CFL0fNV9XtGpUYKD67FrWG4GNNBnZDCGzbHubL8ph4KNc1u72XcGWkCAcsadGVA1-9NRwEsyvqzUF8'; 
      
      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        return currentToken;
      } else {
        return null;
      }
    } else {
      console.warn('⚠️ Push notifications are blocked by the browser.');
      return null;
    }
  } catch (err) {
    if (err.message && err.message.includes('blocked')) {
      console.warn("⚠️ Push notifications are blocked by browser settings.");
    } else {
      console.warn('⚠️ Push tokens could not be retrieved. Falling back to in-app alerts.');
    }
    return null;
  }
};

/**
 * Handle foreground messages
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("📨 Foreground message received:", payload);
      resolve(payload);
    });
  });

export default app;
