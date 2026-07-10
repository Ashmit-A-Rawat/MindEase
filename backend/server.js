// server.dev.js (use as server.js in dev)
import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import passport from "passport";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import connectDB from "./config/db.js";
import "./utils/passport.js";
import Appointment from "./models/Appointment.js";

// MAIN app routes (keep /api1 prefix)
import slotRoutes from "./routes/slotRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import counsellorRoutes from "./routes/counsellorRoutes.js";
import userRoutesMain from "./routes/userRoutes.js"; // /api1/users
import testRoutes from "./routes/testRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import mlRoutes from "./routes/mlRoutes.js";
import wellnessRoutes from "./routes/wellnessRoutes.js";
import authRoutes from "./routes/authRoutes.js";

// Chat app routes
import userRoutes from "./routes/userRoutes.js"; // or merged userRoutes
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect DB once
connectDB().catch((err) => {
  console.error("DB connection failed:", err);
  process.exit(1);
});

// CORS for local dev frontends
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173", // main frontend
  process.env.CHAT_FRONTEND || "http://localhost:3000",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Session: secure cookie in production only (HTTP-only in dev is fine —
// there's no TLS to require). This was previously inverted
// (`NODE_ENV === "development"`), meaning a real production deployment
// would have sent the session cookie over plain HTTP.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    rolling: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Mount routes
app.use("/api1", authRoutes);
app.use("/api1/slots", slotRoutes);
app.use("/api1/appointments", appointmentRoutes);
app.use("/api1/students", studentRoutes);
app.use("/api1/counsellors", counsellorRoutes);
app.use("/api1/users", userRoutesMain);
app.use("/api1/tests", testRoutes);
app.use("/api1/analysis", analysisRoutes);
app.use("/api1/ml", mlRoutes);
app.use("/api1/wellness", wellnessRoutes);

// Chat endpoints
app.use("/api1/user", userRoutes);
app.use("/api1/chat", chatRoutes);
app.use("/api1/message", messageRoutes);

// Basic root for dev
app.get("/", (req, res) => res.send("API (dev) is running"));


// HTTP + socket.io
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

const io = new IOServer(server, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("setup", (userData) => {
    const room = userData?._id || userData?.id;
    if (room) {
      socket.join(room);
      socket.emit("connected");
    } else {
      socket.emit("connected");
    }
  });

  socket.on("join chat", (room) => {
    socket.join(room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessage) => {
    const chat = newMessage?.chat;
    if (!chat?.users) return;
    chat.users.forEach((user) => {
      const userId = user._id || user.id;
      if (!userId) return;
      if (userId.toString() === newMessage.sender._id?.toString()) return;
      socket.in(userId).emit("message recieved", newMessage);
    });
  });

  // WebRTC signaling relay for live counseling calls. The room is the
  // appointment ID — both participants join it, then exchange opaque
  // simple-peer signal blobs through the server without it inspecting them.
  // No media ever touches the backend; it only relays SDP/ICE handshake data.
  socket.on("join-call", (appointmentId) => {
    if (!appointmentId) return;
    const room = `call-${appointmentId}`;
    // Snapshot before joining: the initiator side needs to know whether the
    // other participant is already here (so it can start signaling right
    // away) versus still arriving (so it should wait for call-peer-joined
    // instead of broadcasting its SDP offer into an empty room and losing it).
    const peerAlreadyPresent = (io.sockets.adapter.rooms.get(room)?.size || 0) > 0;
    socket.join(room);
    socket.to(room).emit("call-peer-joined");
    socket.emit("call-room-status", { peerPresent: peerAlreadyPresent });
  });

  socket.on("call-signal", ({ appointmentId, signal }) => {
    if (!appointmentId) return;
    socket.to(`call-${appointmentId}`).emit("call-signal", { signal });
  });

  socket.on("leave-call", (appointmentId) => {
    if (!appointmentId) return;
    const room = `call-${appointmentId}`;
    socket.to(room).emit("call-peer-left");
    socket.leave(room);
  });

  // Emotion detection relay: each participant analyzes their own local
  // camera frames against emotion-service directly (never through this
  // backend) and just relays the resulting label to the other participant
  // live. Also appends a timestamped entry to the appointment's emotionLog
  // so a counsellor can review the session afterward — fire-and-forget,
  // never blocks the live relay above and never breaks the call if it fails.
  socket.on("emotion-update", ({ appointmentId, emotion, confidence, role }) => {
    if (!appointmentId) return;
    socket.to(`call-${appointmentId}`).emit("emotion-update", { emotion, confidence });

    if (emotion && role) {
      Appointment.findByIdAndUpdate(appointmentId, {
        $push: { emotionLog: { timestamp: new Date(), emotion, confidence, participantRole: role } },
      }).catch((err) => console.error("Failed to persist emotion log:", err.message));
    }
  });

  socket.on("disconnecting", () => {
    // Fires *before* socket.io clears socket.rooms (unlike "disconnect"),
    // so the peer on the other side of a call can be notified to tear down.
    for (const room of socket.rooms) {
      if (room.startsWith("call-")) socket.to(room).emit("call-peer-left");
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running on port ${PORT}`);
});
