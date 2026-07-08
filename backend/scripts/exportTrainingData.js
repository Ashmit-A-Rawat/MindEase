// backend/scripts/exportTrainingData.js
//
// Exports real MindEase student data (User + WellnessIntake + TestResult) as
// a CSV with the exact same column header as ml-service/student_depression.csv
// (the Kaggle bootstrap dataset), so it can be concatenated directly onto that
// file for retraining once there's enough real usage to matter — see
// ml-service/SCHEMA_MAPPING.md's "Training data strategy" section.
//
// Only students with BOTH a WellnessIntake AND at least one PHQ-9 attempt are
// included — WellnessIntake supplies the features, PHQ-9 supplies the
// derived label (no real "Depression" diagnosis exists in this app, so a
// score >= 10 threshold is used, matching the app's own existing severity
// bucketing: Moderate starts at 10 in TestPage.jsx's getSeverity()).
//
// Usage: node backend/scripts/exportTrainingData.js
// Output: ml-service/mindease_export.csv

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import User from "../models/User.js";
import WellnessIntake from "../models/WellnessIntake.js";
import TestResult from "../models/TestResult.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "../../ml-service/mindease_export.csv");

const HEADER = [
  "id", "Gender", "Age", "City", "Profession", "Academic Pressure", "Work Pressure",
  "CGPA", "Study Satisfaction", "Job Satisfaction", "Sleep Duration", "Dietary Habits",
  "Degree", "Have you ever had suicidal thoughts ?", "Work/Study Hours",
  "Financial Stress", "Family History of Mental Illness", "Depression",
];

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function calculateAge(dob) {
  if (!dob) return "";
  const ms = Date.now() - new Date(dob).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const students = await User.find({ role: "student" });
  const rows = [];
  let skippedNoIntake = 0;
  let skippedNoPhq9 = 0;

  for (const student of students) {
    const intake = await WellnessIntake.findOne({ studentId: student._id });
    if (!intake) {
      skippedNoIntake++;
      continue;
    }

    const testResult = await TestResult.findOne({ studentId: student._id });
    const phq9Attempts = (testResult?.tests || [])
      .filter((t) => t.testType === "PHQ-9")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestPhq9 = phq9Attempts[0];
    if (!latestPhq9) {
      skippedNoPhq9++;
      continue;
    }

    const suicidalThoughts = latestPhq9.answers?.[8] >= 1 ? "Yes" : "No";
    const depression = latestPhq9.score >= 10 ? 1 : 0;

    rows.push([
      student._id.toString(),
      intake.gender || "",
      calculateAge(student.dob),
      intake.city || "",
      "Student",
      intake.academicPressure ?? "",
      intake.workPressure ?? "",
      intake.cgpa ?? "",
      intake.studySatisfaction ?? "",
      intake.jobSatisfaction ?? "",
      intake.sleepDuration || "",
      intake.dietaryHabits || "",
      intake.degree || "",
      suicidalThoughts,
      intake.workStudyHours ?? "",
      intake.financialStress ?? "",
      intake.familyHistory ? "Yes" : "No",
      depression,
    ]);
  }

  const csv = [HEADER, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
  fs.writeFileSync(OUTPUT_PATH, csv);

  console.log(`\nExported ${rows.length} rows to ${OUTPUT_PATH}`);
  console.log(`Skipped ${skippedNoIntake} students with no WellnessIntake, ${skippedNoPhq9} with no PHQ-9 attempt`);
  if (rows.length < 200) {
    console.log(
      `\nNote: ${rows.length} rows isn't enough to retrain on meaningfully (the Kaggle bootstrap set has ~27.9k). ` +
      `This export is still correct — just keep training on student_depression.csv until real usage grows. ` +
      `To combine both later: pd.concat([pd.read_csv('student_depression.csv'), pd.read_csv('mindease_export.csv')])`
    );
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
