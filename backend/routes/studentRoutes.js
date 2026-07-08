import express from "express";
import User from "../models/User.js";
const router = express.Router();

router.get("/:studentId", async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId).select("-password");
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
