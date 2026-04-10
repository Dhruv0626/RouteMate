import { io } from "socket.io-client";

// Connect to the backend
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: false, // Wait until explicit connection
  transports: ["websocket", "polling"], // Allow fallback
  forceNew: true, // Prevent reusing old dead connections 
  reconnectionAttempts: 5,
});

export default socket;
