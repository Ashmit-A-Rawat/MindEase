import WellnessIntake from "../models/WellnessIntake.js";

export const getIntake = async (req, res) => {
  const { studentId } = req.params;
  const intake = await WellnessIntake.findOne({ studentId });
  res.json(intake || null);
};

export const saveIntake = async (req, res) => {
  const { studentId, ...fields } = req.body;
  if (!studentId) return res.status(400).json({ message: "studentId is required" });

  const intake = await WellnessIntake.findOneAndUpdate(
    { studentId },
    { studentId, ...fields },
    { upsert: true, new: true, runValidators: true }
  );
  res.json(intake);
};
