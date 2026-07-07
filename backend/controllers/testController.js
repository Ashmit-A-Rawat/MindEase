import TestQuestion from "../models/TestQuestion.js";
import TestResult from "../models/TestResult.js";
import { buildResponsesArray, callMlService } from "../utils/mlClient.js";

// Get questions for a test
export const getQuestions = async (req, res) => {
  const { testType } = req.params;
  const test = await TestQuestion.findOne({ testType });
  if (!test) return res.status(404).json({ message: "Test not found" });
  res.json(test);
};

// Save test result
export const saveTestResult = async (req, res) => {
  const { studentId, testType, answers, score, severity, recommendation } = req.body;

  let testResult = await TestResult.findOne({ studentId });
  const testAttempt = { testType, answers, score, severity, recommendation };

  if (testResult) {
    testResult.tests.push(testAttempt);
  } else {
    testResult = new TestResult({ studentId, tests: [testAttempt] });
  }

  await testResult.save();
  const savedAttempt = testResult.tests[testResult.tests.length - 1];

  // Best-effort ML enrichment. The test result is already saved above, so a
  // down ML service never blocks or fails a student's test submission.
  let mlEnriched = false;
  try {
    const responses = await buildResponsesArray(studentId);
    const [riskResult, wellnessResult, clusterResult] = await Promise.all([
      callMlService("post", "/predict", { responses }),
      callMlService("post", "/predict/wellness-score", { responses }),
      callMlService("post", "/predict/cluster", { responses }),
    ]);

    if (riskResult.ok || wellnessResult.ok || clusterResult.ok) {
      savedAttempt.mlAnalysis = {
        riskPrediction: riskResult.ok ? riskResult.data.prediction : undefined,
        riskProbability: riskResult.ok ? riskResult.data.probability : undefined,
        riskLevel: riskResult.ok ? riskResult.data.analysis?.risk_level : undefined,
        wellnessScore: wellnessResult.ok ? wellnessResult.data.wellness_score : undefined,
        clusterId: clusterResult.ok ? clusterResult.data.cluster_id : undefined,
        clusterLabel: clusterResult.ok ? clusterResult.data.profile?.label : undefined,
        computedAt: new Date(),
      };
      await testResult.save();
      mlEnriched = true;
    }
  } catch (mlErr) {
    console.error("ML enrichment failed (non-blocking):", mlErr.message);
  }

  res.json({ message: "Test saved successfully", mlEnriched, testId: savedAttempt._id });
};

// Get all tests of a student
export const getStudentTests = async (req, res) => {
  const { studentId } = req.params;
  const result = await TestResult.findOne({ studentId });
  res.json(result || { tests: [] });
};

// Get specific test report
export const getTestReport = async (req, res) => {
  const { studentId, testId } = req.params;
  const result = await TestResult.findOne({ studentId });
  if (!result) return res.status(404).json({ message: "No tests found" });

  const test = result.tests.id(testId);
  if (!test) return res.status(404).json({ message: "Test not found" });

  res.json(test);
};
