import mongoose from "mongoose";

const wellnessIntakeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    city: { type: String, trim: true },
    cgpa: { type: Number, min: 0, max: 10 },
    academicPressure: { type: Number, min: 0, max: 5 },
    workPressure: { type: Number, min: 0, max: 5 },
    studySatisfaction: { type: Number, min: 0, max: 5 },
    jobSatisfaction: { type: Number, min: 0, max: 5, default: 0 },
    sleepDuration: {
      type: String,
      enum: ["Less than 5 hours", "5-6 hours", "7-8 hours", "More than 8 hours"],
    },
    dietaryHabits: { type: String, enum: ["Healthy", "Moderate", "Unhealthy"] },
    degree: { type: String, trim: true },
    workStudyHours: { type: Number, min: 0, max: 24 },
    financialStress: { type: Number, min: 0, max: 5 },
    familyHistory: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("WellnessIntake", wellnessIntakeSchema);
