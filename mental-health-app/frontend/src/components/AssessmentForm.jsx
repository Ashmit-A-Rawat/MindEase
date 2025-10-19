import { useState } from "react";

// Updated questions array to match backend expectations
export const questions = [
  { feature: "id", text: "Student ID", type: "text", placeholder: "Enter your ID (optional)" },
  { feature: "Gender", text: "Gender", type: "select", options: ["Male", "Female", "Other"] },
  { feature: "Age", text: "Age", type: "number", required: true, min: 16, max: 60 },
  { feature: "City", text: "City", type: "text", placeholder: "Enter your city" },
  { feature: "Profession", text: "Profession", type: "select", options: ["Student", "Working Professional", "Unemployed", "Other"] },
  { feature: "AcademicPressure", text: "Academic Pressure Level", type: "scale", required: true },
  { feature: "WorkPressure", text: "Work/Career Pressure Level", type: "scale", required: true },
  { feature: "CGPA", text: "CGPA/Academic Performance", type: "number", required: true, min: 0, max: 10, step: 0.1 },
  { feature: "StudySatisfaction", text: "Study Satisfaction Level", type: "scale" },
  { feature: "JobSatisfaction", text: "Job/Career Satisfaction Level", type: "scale" },
  { feature: "SleepDuration", text: "Average Sleep Duration (hours per night)", type: "number", required: true, min: 0, max: 24 },
  { feature: "DietaryHabits", text: "Dietary Habits", type: "select", options: ["Healthy", "Average", "Unhealthy"] },
  { feature: "Degree", text: "Degree/Education Level", type: "select", options: ["High School", "Bachelor", "Master", "PhD", "Other"] },
  { feature: "SuicidalThoughts", text: "Have you ever had suicidal thoughts?", type: "select", options: ["Yes", "No"], critical: true },
  { feature: "WorkStudyHours", text: "Work/Study Hours per day", type: "number", min: 0, max: 24 },
  { feature: "FinancialStress", text: "Do you experience financial stress?", type: "select", options: ["Yes", "No"] },
  { feature: "FamilyHistory", text: "Family History of Mental Illness", type: "select", options: ["Yes", "No"] },
];

function AssessmentForm({ responses, setResponses, onSubmit, loading, error }) {
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (feature, value) => {
    setResponses(prev => ({ ...prev, [feature]: value }));
    
    // Clear validation error for this field
    if (validationErrors[feature]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[feature];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    const requiredFields = questions.filter(q => q.required).map(q => q.feature);
    
    requiredFields.forEach(field => {
      const value = responses[field];
      if (!value || value === '') {
        const question = questions.find(q => q.feature === field);
        errors[field] = `${question.text} is required`;
      }
    });

    // Additional validation
    if (responses.Age && (responses.Age < 16 || responses.Age > 60)) {
      errors.Age = "Age must be between 16 and 60";
    }

    if (responses.CGPA && (responses.CGPA < 0 || responses.CGPA > 10)) {
      errors.CGPA = "CGPA must be between 0 and 10";
    }

    if (responses.SleepDuration && (responses.SleepDuration < 0 || responses.SleepDuration > 24)) {
      errors.SleepDuration = "Sleep duration must be between 0 and 24 hours";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    onSubmit();
  };

  const getScaleDescription = (value) => {
    switch(value) {
      case "0": return "Never/None";
      case "1": return "Sometimes/Low";
      case "2": return "Often/Moderate";
      case "3": return "Almost Always/High";
      case "4": return "Always/Very High";
      default: return "";
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg mb-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-gray-800">Mental Health Assessment</h2>
        <p className="text-gray-600">Please answer all questions honestly. Your responses are confidential.</p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm">
            <strong>Important:</strong> This assessment is for educational purposes only and does not replace professional medical advice. 
            If you're experiencing a mental health crisis, please contact emergency services or a crisis helpline immediately.
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠</span>
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questions.map((q, i) => (
            <div key={i} className={`flex flex-col ${q.critical ? 'md:col-span-2' : ''}`}>
              <label className="mb-2 font-medium text-gray-700">
                {q.text}
                {q.required && <span className="text-red-500 ml-1">*</span>}
                {q.critical && <span className="text-red-600 ml-2 text-sm">(Critical Question)</span>}
              </label>

              {q.type === "text" && (
                <input
                  type="text"
                  placeholder={q.placeholder || `Enter ${q.text.toLowerCase()}`}
                  value={responses[q.feature] || ""}
                  className={`w-full border rounded-lg p-3 text-gray-700 focus:outline-none transition-colors ${
                    validationErrors[q.feature] 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  onChange={(e) => handleChange(q.feature, e.target.value)}
                />
              )}

              {q.type === "number" && (
                <input
                  type="number"
                  min={q.min || 0}
                  max={q.max}
                  step={q.step || 1}
                  placeholder={q.placeholder || `Enter ${q.text.toLowerCase()}`}
                  value={responses[q.feature] || ""}
                  className={`w-full border rounded-lg p-3 text-gray-700 focus:outline-none transition-colors ${
                    validationErrors[q.feature] 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  onChange={(e) => handleChange(q.feature, e.target.value)}
                />
              )}

              {q.type === "scale" && (
                <div className="space-y-2">
                  <select
                    value={responses[q.feature] || ""}
                    className={`w-full border rounded-lg p-3 text-gray-700 focus:outline-none transition-colors ${
                      validationErrors[q.feature] 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    onChange={(e) => handleChange(q.feature, e.target.value)}
                  >
                    <option value="">Select level</option>
                    <option value="0">0 - Never/None</option>
                    <option value="1">1 - Sometimes/Low</option>
                    <option value="2">2 - Often/Moderate</option>
                    <option value="3">3 - Almost Always/High</option>
                    <option value="4">4 - Always/Very High</option>
                  </select>
                  {responses[q.feature] && (
                    <p className="text-sm text-gray-500">
                      Selected: {getScaleDescription(responses[q.feature])}
                    </p>
                  )}
                </div>
              )}

              {q.type === "select" && (
                <select
                  value={responses[q.feature] || ""}
                  className={`w-full border rounded-lg p-3 text-gray-700 focus:outline-none transition-colors ${
                    validationErrors[q.feature] 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                    } ${q.critical ? 'border-2 border-orange-300 bg-orange-50' : ''}`}
                  onChange={(e) => handleChange(q.feature, e.target.value)}
                >
                  <option value="">Select option</option>
                  {q.options.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {validationErrors[q.feature] && (
                <p className="mt-1 text-sm text-red-600">{validationErrors[q.feature]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg shadow hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Analyzing...
              </div>
            ) : (
              "Submit Assessment"
            )}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 space-y-2">
          <p>All responses are processed securely and confidentially.</p>
          <p>Assessment typically takes 2-3 minutes to complete.</p>
        </div>
      </form>
    </div>
  );
}

export default AssessmentForm;