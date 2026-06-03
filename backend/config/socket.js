const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

/**
 * Initialize Socket.io with JWT-based authentication
 * and room-based channels per user.
 */
function initSocket(server) {
  // Support comma-separated CLIENT_URL and any *.vercel.app origin
  const allowedOrigins = ["http://localhost:3000"];
  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(",").forEach(url => allowedOrigins.push(url.trim()));
  }

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(a => origin.replace(/\/$/, "") === a.replace(/\/$/, ""));
        const isVercel = /\.vercel\.app$/.test(origin);
        const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
        if (isAllowed || isVercel || isLocalhost) {
          callback(null, true);
        } else {
          callback(new Error(`Socket origin ${origin} not allowed`));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware — verify JWT from handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.userId} (${socket.userRole})`);

    // Join user-specific room
    socket.join(`user_${socket.userId}`);

    // Join role-based rooms for broadcast
    socket.join(`role_${socket.userRole}`);

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
}

module.exports = initSocket;
