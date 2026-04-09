let io;

export const initSocket = (socketInstance) => {
  io = socketInstance;
  console.log("✅ SocketManager: IO instance initialized");
};

export const getIO = () => {
  if (!io) {
    console.warn("⚠️ SocketManager: Accessing IO before initialization");
  }
  return io;
};

/**
 * Emit a notification to a specific user
 * @param {string} userId 
 * @param {object} notification 
 */
export const emitNotification = (userId, notification) => {
  if (io) {
    io.to(userId.toString()).emit("new_notification", notification);
    console.log(`🚀 SocketManager: Emitted notification to User ${userId}`);
  } else {
    console.warn(`❌ SocketManager: Cannot emit to User ${userId} - IO not initialized`);
  }
};
