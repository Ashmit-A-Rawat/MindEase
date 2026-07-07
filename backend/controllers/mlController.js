import TestResult from "../models/TestResult.js";
import { buildResponsesArray, callMlService } from "../utils/mlClient.js";

export const getRisk = async (req, res) => {
  const { studentId } = req.params;
  const responses = await buildResponsesArray(studentId);
  const result = await callMlService("post", "/predict", { responses });
  if (!result.ok) {
    return res.status(503).json({ success: false, message: "ML service unavailable", error: result.error });
  }
  res.json(result.data);
};

export const getWellnessScore = async (req, res) => {
  const { studentId } = req.params;
  const responses = await buildResponsesArray(studentId);
  const result = await callMlService("post", "/predict/wellness-score", { responses });
  if (!result.ok) {
    return res.status(503).json({ success: false, message: "ML service unavailable", error: result.error });
  }
  res.json(result.data);
};

export const getCluster = async (req, res) => {
  const { studentId } = req.params;
  const responses = await buildResponsesArray(studentId);
  const result = await callMlService("post", "/predict/cluster", { responses });
  if (!result.ok) {
    return res.status(503).json({ success: false, message: "ML service unavailable", error: result.error });
  }
  res.json(result.data);
};

export const getTrend = async (req, res) => {
  const { studentId } = req.params;
  const testType = req.query.testType || "PHQ-9";

  const testResult = await TestResult.findOne({ studentId });
  const scores = (testResult?.tests || [])
    .filter((t) => t.testType === testType)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((t) => t.score);

  const result = await callMlService("post", "/predict/trend", { scores });
  if (!result.ok) {
    return res.status(503).json({ success: false, message: "ML service unavailable", error: result.error });
  }
  res.json(result.data);
};

// Population-level BI — not per-student, computed once at training time.
export const getClusters = async (req, res) => {
  const result = await callMlService("get", "/analysis/clusters");
  if (!result.ok) {
    return res.status(503).json({ success: false, message: "ML service unavailable", error: result.error });
  }
  res.json(result.data);
};

export const getAssociations = async (req, res) => {
  const result = await callMlService("get", "/analysis/associations");
  if (!result.ok) {
    return res.status(503).json({ success: false, message: "ML service unavailable", error: result.error });
  }
  res.json(result.data);
};
