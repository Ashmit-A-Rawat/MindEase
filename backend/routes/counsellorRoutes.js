import express from "express";
import User from "../models/User.js"; // updated
const router = express.Router();

// Get counsellor by ID
router.get("/:counsellorId", async (req, res) => {
  try {
    const counsellor = await User.findById(req.params.counsellorId).select("-password");
    if (!counsellor || counsellor.role !== "counsellor") {
      return res.status(404).json({ message: "Counsellor not found" });
    }
    res.json(counsellor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
