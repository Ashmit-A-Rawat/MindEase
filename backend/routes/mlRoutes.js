import express from "express";
import {
  getRisk,
  getWellnessScore,
  getCluster,
  getTrend,
  getClusters,
  getAssociations,
  getFeatureImportance,
} from "../controllers/mlController.js";

const router = express.Router();

router.get("/risk/:studentId", getRisk);
router.get("/wellness-score/:studentId", getWellnessScore);
router.get("/cluster/:studentId", getCluster);
router.get("/trend/:studentId", getTrend);
router.get("/clusters", getClusters);
router.get("/associations", getAssociations);
router.get("/feature-importance", getFeatureImportance);

export default router;
