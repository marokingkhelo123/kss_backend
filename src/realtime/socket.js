import { Server } from "socket.io";

// Map userId -> Set of socket ids for targeted emits
const userSockets = new Map();
let io;

export const initSocketServer = (httpServer) => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query?.userId;
    console.log("[socket] connection", { socketId: socket.id, userId });
    if (userId) {
      let sockets = userSockets.get(userId);
      if (!sockets) {
        sockets = new Set();
        userSockets.set(userId, sockets);
      }
      sockets.add(socket.id);
    }

    socket.on("disconnect", () => {
      const userIdForSocket = socket.handshake.query?.userId;
      console.log("[socket] disconnect", { socketId: socket.id, userId: userIdForSocket });
      if (!userIdForSocket) return;
      const sockets = userSockets.get(userIdForSocket);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userIdForSocket);
      }
    });
  });

  return io;
};

export const emitForceLogout = (userId) => {
  if (!io) {
    console.warn("[socket] emitForceLogout called but io not initialized");
    return;
  }
  const sockets = userSockets.get(String(userId));
  if (!sockets || sockets.size === 0) {
    console.log("[socket] emitForceLogout no sockets for user", userId);
    return;
  }
  console.log("[socket] emitForceLogout", { userId, sockets: Array.from(sockets) });
  sockets.forEach((socketId) => {
    io.to(socketId).emit("force-logout", { reason: "inactive" });
  });
};

