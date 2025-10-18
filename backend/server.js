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

// MAIN app routes (keep /api1 prefix)
import slotRoutes from "./routes/slotRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import counsellorRoutes from "./routes/counsellorRoutes.js";
import userRoutesMain from "./routes/userRoutes.js"; // /api1/users
import testRoutes from "./routes/testRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
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

// Session: dev-friendly (secure=false in dev)
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
      secure: process.env.NODE_ENV === "development", // false in dev
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

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running on port ${PORT}`);
});
