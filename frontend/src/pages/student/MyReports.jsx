import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";

export default function MyReports() {
  const { studentId } = useParams();
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get(`/tests/results/${studentId}`);
        setTests(res.data.tests || []);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, [studentId]);

  // Function to determine severity color
  const getSeverityColor = (severity) => {
    const severityColors = {
      low: "bg-green-100 text-green-800",
      moderate: "bg-amber-100 text-amber-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    return severityColors[severity.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-400 rounded-full mb-4"></div>
          <p className="text-blue-600 font-medium">Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-3">
            My Test Reports
          </h1>
          <p className="text-gray-600">Review your assessment history and progress</p>
        </div>

        {tests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center animate-fade-in">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No tests taken yet</h3>
            <p className="text-gray-500">Your test reports will appear here once you complete assessments.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {tests.map((test, index) => (
              <div 
                key={test._id} 
                className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer border border-blue-50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/student/${studentId}/reports/${test._id}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">{test.testType}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(test.severity)}`}>
                      {test.severity}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">SCORE</p>
                      <p className="text-lg font-bold text-blue-800">{test.score}</p>
                    </div>
                    <div className="bg-teal-50 p-3 rounded-lg">
                      <p className="text-xs text-teal-600 font-medium">DATE TAKEN</p>
                      <p className="text-sm font-medium text-teal-800">{new Date(test.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end items-center text-sm text-gray-500">
                    <div className="text-blue-500 font-medium flex items-center">
                      View details
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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