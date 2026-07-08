import express from "express";
import User from "../models/User.js";
import { protectRoute } from "../middelware/auth.middleware.js";
import upload from "../middelware/multer.js";
import { getFileUrl, shouldMarkVerified } from "../utils/helper.js";

// Chat-specific controllers
import { allUsers, debugUsers } from "../controllers/user.controller.js";

const router = express.Router();

// Get all students
router.get("/students", async (req, res) => {
  const students = await User.find({ role: "student" }).select("-password");
  res.json(students);
});

// Update user (profile, verification, etc.)
router.post(
  "/update",
  protectRoute,
  upload.fields([
    { name: "profile_pic", maxCount: 1 },
    { name: "id_card", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user && (req.user._id || req.user.id);
      if (!userId) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }

      const { name, college_name, academic_year, dob } = req.body;

      // Parse verification JSON if provided
      let verification = null;
      if (req.body.verification) {
        try {
          verification = JSON.parse(req.body.verification);
        } catch (err) {
          console.log("Could not parse verification JSON:", err);
        }
      }

      const profileFile = req.files?.profile_pic?.[0] || null;
      const idFile = req.files?.id_card?.[0] || null;

      const profileUrl = getFileUrl(profileFile);
      const idUrl = getFileUrl(idFile);

      const update = {};
      if (name) update.name = name;
      if (college_name) update.collegeName = college_name;
      if (academic_year) update.academicYear = academic_year;
      if (dob) {
        const parsed = new Date(dob);
        if (!Number.isNaN(parsed.getTime())) update.dob = parsed;
      }
      if (profileUrl) update.profilePic = profileUrl;
      if (idUrl) update.idCard = idUrl;

      if (shouldMarkVerified(verification)) update.isVerified = true;
      if (verification) update.lastVerification = verification;

      Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

      const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password -__v");

      if (!updatedUser) {
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      return res.status(200).json({
        status: "success",
        verification: verification || null,
        user: updatedUser,
      });
    } catch (err) {
      console.error("Error in /api/user/update:", err);
      return res.status(500).json({
        status: "error",
        message: "Could not update verification",
        details: err.message,
      });
    }
  }
);

// Search users for chat (protected)
router.get("/search", protectRoute, allUsers);

// Debug users (protected)
router.get("/debug", protectRoute, debugUsers);

export default router;
