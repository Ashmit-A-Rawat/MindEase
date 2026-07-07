import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";

export default function TestPage() {
  const { studentId, testType } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await api.get(`/tests/questions/${testType}`);
        setQuestions(res.data.questions);
        setAnswers(new Array(res.data.questions.length).fill(0));
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };
    fetchQuestions();
  }, [testType]);

  const handleChange = (index, value) => {
    const updated = [...answers];
    updated[index] = parseInt(value);
    setAnswers(updated);
  };

  const getSeverity = (score) => {
    if (testType === "PHQ-9") {
      if (score <= 4) return "Minimal"; 
      if (score <= 9) return "Mild"; 
      if (score <= 14) return "Moderate"; 
      return "Severe";
    } else if (testType === "GAD-7") {
      if (score <= 4) return "Minimal"; 
      if (score <= 9) return "Mild"; 
      if (score <= 14) return "Moderate"; 
      return "Severe";
    } else {
      if (score <= 4) return "Minimal"; 
      if (score <= 9) return "Mild"; 
      if (score <= 14) return "Moderate"; 
      return "Severe";
    }
  };

  const getRecommendation = (severity) => {
    const map = {
      "Minimal": "Your responses suggest minimal symptoms. Continue practicing self-care and monitoring your well-being.",
      "Mild": "You're experiencing mild symptoms. Consider lifestyle adjustments, stress management techniques, and regular self-check-ins.",
      "Moderate": "Your responses indicate moderate symptoms. We recommend consulting with a mental health professional for guidance.",
      "Severe": "Your results suggest severe symptoms. Please seek professional help as soon as possible for proper support and treatment.",
    };
    return map[severity] || "";
  };

  const getTestName = () => {
    const testNames = {
      "PHQ-9": "PHQ-9 Depression Assessment",
      "GAD-7": "GAD-7 Anxiety Assessment",
      "GHQ-12": "GHQ-12 General Health Questionnaire"
    };
    return testNames[testType] || testType;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const score = answers.reduce((a,b)=>a+b,0);
      const severity = getSeverity(score);
      const recommendation = getRecommendation(severity);

      await api.post("/tests/results", {
        studentId,
        testType,
        answers,
        score,
        severity,
        recommendation
      });

      setResult({ score, severity, recommendation });

      // Fetch a model-backed risk assessment alongside the static severity
      // bucket above. Best-effort — a down ML service shouldn't block the
      // student from seeing their test result.
      setMlLoading(true);
      try {
        const [riskRes, wellnessRes] = await Promise.all([
          api.get(`/ml/risk/${studentId}`),
          api.get(`/ml/wellness-score/${studentId}`),
        ]);
        setMlResult({
          riskLevel: riskRes.data?.analysis?.risk_level,
          riskColor: riskRes.data?.analysis?.risk_color,
          probability: riskRes.data?.probability,
          wellnessScore: wellnessRes.data?.wellness_score,
          featureImportance: riskRes.data?.feature_importance,
        });
      } catch (mlError) {
        console.error("ML risk assessment unavailable:", mlError);
      } finally {
        setMlLoading(false);
      }
    } catch (error) {
      console.error("Error submitting test:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const getProgress = () => {
    return ((currentQuestion + 1) / questions.length) * 100;
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-400 rounded-full mb-4"></div>
          <p className="text-blue-600 font-medium">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-teal-600 hover:text-teal-800 mb-6 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Assessments
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-2">
              {getTestName()}
            </h1>
            <p className="text-gray-600">Answer each question based on how you've felt over the past two weeks</p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Question {currentQuestion + 1} of {questions.length}</span>
              <span className="text-sm font-medium text-blue-600">{Math.round(getProgress())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-teal-400 h-2 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${getProgress()}%` }}
              ></div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in">
              <p className="text-lg font-medium text-gray-800 mb-4">
                {questions[currentQuestion]}
              </p>
              
              <div className="space-y-3">
                {[0, 1, 2, 3].map((value) => (
                  <label key={value} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-white cursor-pointer transition-colors duration-150">
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      value={value}
                      checked={answers[currentQuestion] === value}
                      onChange={(e) => handleChange(currentQuestion, e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-700">
                      {value === 0 && "Not at all"}
                      {value === 1 && "On some days"}
                      {value === 2 && "More than half the days"}
                      {value === 3 && "Nearly every day"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={answers[currentQuestion] === undefined}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={answers.includes(undefined) || isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Assessment
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border border-teal-200 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-teal-800 mb-2">Assessment Complete</h2>
              <p className="text-gray-600">Thank you for completing the assessment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Score</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{result.score}</p>
              </div>
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                <p className="text-xs text-teal-600 font-medium uppercase tracking-wider">Severity</p>
                <p className="text-sm font-medium text-teal-800 mt-1">{result.severity}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">Questions</p>
                <p className="text-sm font-medium text-indigo-800 mt-1">{questions.length}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recommendation
              </h3>
              <p className="text-gray-700">{result.recommendation}</p>
            </div>

            {mlLoading && (
              <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Computing your personalized risk assessment...
              </div>
            )}

            {mlResult && (
              <div className="mt-4 p-4 rounded-lg border-2 animate-fade-in" style={{ borderColor: mlResult.riskColor || "#e5e7eb" }}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Personalized Risk Assessment</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Risk Level</p>
                    <p className="text-lg font-bold" style={{ color: mlResult.riskColor || "#374151" }}>
                      {mlResult.riskLevel || "Unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Wellness Score</p>
                    <p className="text-lg font-bold text-gray-800">
                      {mlResult.wellnessScore != null ? `${mlResult.wellnessScore}/100` : "—"}
                    </p>
                  </div>
                </div>
                {mlResult.featureImportance?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Top Contributing Factors</p>
                    <div className="flex flex-wrap gap-2">
                      {mlResult.featureImportance.map((f) => (
                        <span key={f.feature} className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                          {f.feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Based on your Wellness Profile. {" "}
                  <button
                    type="button"
                    onClick={() => navigate(`/student/${studentId}/wellness-intake`)}
                    className="text-teal-600 hover:underline"
                  >
                    Update it
                  </button>
                  {" "}for a more accurate assessment.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => navigate(`/student/${studentId}/reports`)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center"
              >
                View All Reports
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.6s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
}