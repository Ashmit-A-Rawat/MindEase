import axios from "axios";
import User from "../models/User.js";
import WellnessIntake from "../models/WellnessIntake.js";
import TestResult from "../models/TestResult.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5002";

// Matches ml-service/train_all_models.py's Sleep Duration bucket-to-hours
// extraction, applied in reverse for WellnessIntake's enum.
const SLEEP_HOURS_MAP = {
  "Less than 5 hours": 4,
  "5-6 hours": 5.5,
  "7-8 hours": 7.5,
  "More than 8 hours": 9,
};

function calculateAge(dob) {
  if (!dob) return null;
  const ms = Date.now() - new Date(dob).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
}

// Builds the positional `responses` array ml-service/app.py expects, from
// whatever real MindEase data exists for this student. Missing WellnessIntake
// fields are sent as empty strings — ml-service's own defaults take over from
// there (see ml-service/SCHEMA_MAPPING.md's "intended degraded mode" note).
export async function buildResponsesArray(studentId) {
  const [user, intake, testResult] = await Promise.all([
    User.findById(studentId),
    WellnessIntake.findOne({ studentId }),
    TestResult.findOne({ studentId }),
  ]);

  const age = calculateAge(user?.dob);

  // Suicidal-thoughts proxy: PHQ-9 item 9 ("Thoughts of self-harm or death?"),
  // most recent attempt. See SCHEMA_MAPPING.md.
  let suicidalThoughts = "No";
  if (testResult?.tests?.length) {
    const latestPhq9 = [...testResult.tests]
      .filter((t) => t.testType === "PHQ-9")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (latestPhq9?.answers?.[8] >= 1) suicidalThoughts = "Yes";
  }

  const sleepHours = intake?.sleepDuration ? SLEEP_HOURS_MAP[intake.sleepDuration] : "";

  return [
    String(studentId),
    intake?.gender || "",
    age ?? "",
    intake?.city || "",
    "Student",
    intake?.academicPressure ?? "",
    intake?.workPressure ?? "",
    intake?.cgpa ?? "",
    intake?.studySatisfaction ?? "",
    intake?.jobSatisfaction ?? "",
    sleepHours,
    intake?.dietaryHabits || "",
    intake?.degree || "",
    suicidalThoughts,
    intake?.workStudyHours ?? "",
    intake?.financialStress ?? "",
    intake?.familyHistory ? "Yes" : "No",
  ];
}

// Thin axios wrapper — never throws, always resolves to { ok, data|error } so
// callers can degrade gracefully when the ML service is down (same pattern as
// the ECONNREFUSED fallback in mental-health-app/backend/server.js).
export async function callMlService(method, path, data) {
  try {
    const res = await axios({ method, url: `${ML_SERVICE_URL}${path}`, data, timeout: 8000 });
    return { ok: true, data: res.data };
  } catch (err) {
    console.error(`ML service call failed (${method.toUpperCase()} ${path}):`, err.message);
    return { ok: false, error: err.message };
  }
}
