import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";

export default function TestList() {
  const { studentId, counsellorId } = useParams();
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentName, setStudentName] = useState("Student");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch tests
        const testsRes = await api.get(`/tests/results/${studentId}`);
        setTests(testsRes.data.tests || []);
        
        // Try to fetch student name, but handle if the endpoint doesn't exist
        try {
          const studentRes = await api.get(`/users/${studentId}`);
          if (studentRes.data && studentRes.data.fullName) {
            setStudentName(studentRes.data.fullName);
          }
        } catch (studentError) {
          console.warn("Could not fetch student details, using fallback");
          // If we can't get the student name, we'll just use "Student"
        }
      } catch (error) {
        console.error("Error fetching tests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  // Function to determine severity color
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "mild": return "text-green-600 bg-green-100";
      case "moderate": return "text-yellow-600 bg-yellow-100";
      case "severe": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  // Function to format test type for display
  const formatTestType = (testType) => {
    return testType
      ?.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      || "Assessment";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-800 mb-2">
            Assessment History
          </h1>
          <p className="text-indigo-600">
            {studentName}'s completed assessments
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-indigo-700">Loading assessments...</p>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No assessments yet</h3>
            <p className="text-gray-500">This student hasn't completed any assessments.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {tests.map((test, index) => (
              <div
                key={test._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-indigo-100 transform hover:-translate-y-1 p-6"
                style={{ 
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  transitionDelay: `${index * 50}ms`
                }}
                onClick={() => navigate(
                  `/counsellor/${counsellorId}/students/${studentId}/tests/${test._id}`
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-indigo-700 text-lg mb-1">
                      {formatTestType(test.testType)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Score: {test.score || "N/A"}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(test.severity)}`}>
                        {test.severity || "Not specified"}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">
                      Taken on: {new Date(test.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-indigo-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}