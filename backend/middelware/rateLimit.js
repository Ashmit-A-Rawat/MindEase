import rateLimit from "express-rate-limit";

// Mental health data behind these accounts makes brute-forcing credentials
// worse than the usual "someone gets into a random account" risk — cap
// auth attempts per IP rather than leaving signup/login unlimited.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});
