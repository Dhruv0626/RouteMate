// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
const firebaseConfig = {
  apiKey: "AIzaSyDCYwNptmf02BXe1iHs5ZJa6kvvaldrlqA",
  authDomain: "routemate-8c753.firebaseapp.com",
  projectId: "routemate-8c753",
  storageBucket: "routemate-8c753.firebasestorage.app",
  messagingSenderId: "481672405033",
  appId: "1:481672405033:web:73a1c22234838a2bfdfc38",
  measurementId: "G-8ZMWLJZER0"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo192.png', // Fallback icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
