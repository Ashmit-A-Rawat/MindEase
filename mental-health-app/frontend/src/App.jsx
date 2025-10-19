import { useState, useEffect } from "react";
import axios from "axios";
import AssessmentForm, { questions } from "./components/AssessmentForm";
import ResultsPage from "./components/ResultsPage";

// Main App Component
export default function App() {
  const [currentPage, setCurrentPage] = useState("form"); // "form" or "results"
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  // Check system health on component mount
  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/health");
      setSystemHealth(res.data);
      console.log("System health check:", res.data);
    } catch (err) {
      setSystemHealth({ status: "error", message: err.message });
      console.error("System health check failed:", err);
    }
  };

  const handleSubmit = async () => {
    console.log("=== STARTING SUBMISSION ===");
    setLoading(true);
    setError(null);

    try {
      // Convert responses to ordered array matching the questions order
      const orderedResponses = questions.map(q => {
        let value = responses[q.feature] ?? "";

        // Convert numeric fields
        if (q.type === "number" || q.type === "scale") {
          return Number(value);
        }

        // Map select options to numbers if needed
        if (q.feature === "DietaryHabits") {
          switch (value) {
            case "Healthy": return 2;
            case "Average": return 1;
            case "Unhealthy": return 0;
            default: return 1;
          }
        }

        if (q.feature === "SuicidalThoughts" || q.feature === "FinancialStress" || q.feature === "FamilyHistory") {
          return value === "Yes" ? 1 : 0;
        }

        // Keep other text values as-is
        return value;
      });

      console.log("Submitting responses:", orderedResponses);

      const requestData = {
        userId: responses.id || `student_${Date.now()}`,
        responses: orderedResponses,
      };

      console.log("Request payload:", requestData);

      const res = await axios.post("http://localhost:8000/api/submit", requestData, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("=== RESPONSE RECEIVED ===");
      console.log("Status:", res.status);
      console.log("Headers:", res.headers);
      console.log("Full response:", res);
      console.log("Response data:", res.data);

      if (res.data && res.data.success) {
        console.log("Setting result and switching to results page");
        setResult(res.data);
        setCurrentPage("results");
      } else {
        console.error("Response data does not indicate success:", res.data);
        setError("Invalid response from server");
      }
      
    } catch (err) {
      console.error("=== SUBMISSION ERROR ===");
      console.error("Error object:", err);
      console.error("Error message:", err.message);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      if (err.response) {
        const errorMsg = err.response.data?.error || err.response.data?.message || 'Server error';
        setError(`Server Error (${err.response.status}): ${errorMsg}`);
        console.log("Details:", err.response.data?.details);
      } else if (err.code === 'ECONNREFUSED') {
        setError("Cannot connect to server. Please make sure the backend is running on port 8000.");
      } else if (err.code === 'ECONNABORTED') {
        setError("Request timed out. Please try again.");
      } else {
        setError(`Network error: ${err.message}`);
      }
    } finally {
      console.log("=== SUBMISSION COMPLETE ===");
      setLoading(false);
    }
  };

  const handleRetake = () => {
    console.log("Retaking assessment");
    setResponses({});
    setResult(null);
    setError(null);
    setCurrentPage("form");
  };

  console.log("Current state:", {
    currentPage,
    hasResult: !!result,
    loading,
    error,
    responsesCount: Object.keys(responses).length
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* System Health Indicator - only show on form page */}
        {currentPage === "form" && systemHealth && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2 text-blue-600">
                Student Mental Health Assessment
              </h1>
              <div className="text-sm">
                <span className="font-medium">System Status:</span>
                <span className={`ml-2 ${systemHealth.backend === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                  Backend: {systemHealth.backend}
                </span>
                {systemHealth.ml_service && (
                  <span className={`ml-3 ${systemHealth.ml_service.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    ML Service: {systemHealth.ml_service.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debug Info - Remove this in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <strong>Debug:</strong> Page: {currentPage}, Loading: {loading.toString()}, 
            Has Result: {(!!result).toString()}, Has Error: {(!!error).toString()}
          </div>
        )}

        {/* Render current page */}
        {currentPage === "form" ? (
          <AssessmentForm
            responses={responses}
            setResponses={setResponses}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        ) : (
          <ResultsPage
            result={result}
            onRetake={handleRetake}
          />
        )}
      </div>
    </div>
  );
}