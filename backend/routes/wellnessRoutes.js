import express from "express";
import { getIntake, saveIntake } from "../controllers/wellnessController.js";

const router = express.Router();

router.get("/:studentId", getIntake);
router.post("/", saveIntake);

export default router;
