import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import api from "../../lib/api";

export default function TestReportView() {
  const { studentId, testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/tests/results/${studentId}/${testId}`);
        setTest(res.data);
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [studentId, testId]);

  const downloadPDF = () => {
    if (!test) return;
    
    setIsGeneratingPDF(true);
    
    setTimeout(() => {
      const doc = new jsPDF();
      let y = 20;

      // Add a soothing background color
      doc.setFillColor(236, 253, 245);
      doc.rect(0, 0, 220, 300, 'F');

      // Header with gradient effect
      doc.setFillColor(6, 95, 70);
      doc.rect(0, 0, 220, 20, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(`${test.testType} Report`, 105, 12, { align: 'center' });

      // Reset text color
      doc.setTextColor(0, 0, 0);
      y += 20;

      // Test details
      doc.setFontSize(14);
      doc.setTextColor(6, 95, 70);
      doc.text("Test Details", 20, y);
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Score: ${test.score}`, 20, y);
      y += 8;
      doc.text(`Severity: ${test.severity}`, 20, y);
      y += 8;
      doc.text(`Date: ${new Date(test.createdAt).toLocaleDateString()}`, 20, y);
      y += 15;

      // Recommendation
      doc.setFontSize(14);
      doc.setTextColor(6, 95, 70);
      doc.text("Recommendation", 20, y);
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const splitRecommendation = doc.splitTextToSize(test.recommendation, 170);
      doc.text(splitRecommendation, 20, y);
      y += splitRecommendation.length * 6 + 15;

      // Answers
      doc.setFontSize(14);
      doc.setTextColor(6, 95, 70);
      doc.text("Answers", 20, y);
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      test.answers.forEach((ans, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`Q${idx + 1}: ${ans}`, 25, y);
        y += 8;
      });

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Report generated on ${new Date().toLocaleDateString()}`, 105, 290, { align: 'center' });

      doc.save(`${test.testType}_Report_${testId}.pdf`);
      setIsGeneratingPDF(false);
    }, 500);
  };

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
          <div className="h-12 w-12 bg-teal-400 rounded-full mb-4"></div>
          <p className="text-teal-600 font-medium">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!test) return <p className="text-center p-8">Report not found.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-teal-600 hover:text-teal-800 mb-6 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Reports
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600 mb-4 md:mb-0">
              {test.testType} Report
            </h1>
            <button
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-300 flex items-center shadow-md hover:shadow-lg disabled:opacity-75"
            >
              {isGeneratingPDF ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Score</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">{test.score}</p>
            </div>
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
              <p className="text-xs text-teal-600 font-medium uppercase tracking-wider">Date Taken</p>
              <p className="text-sm font-medium text-teal-800 mt-1">{new Date(test.createdAt).toLocaleDateString()}</p>
            </div>
            <div className={`p-4 rounded-xl border ${getSeverityColor(test.severity)}`}>
              <p className="text-xs font-medium uppercase tracking-wider">Severity</p>
              <p className="text-sm font-medium mt-1">{test.severity}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recommendation
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700">{test.recommendation}</p>
            </div>
          </div>

          {test.mlAnalysis?.riskLevel && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Personalized Risk Assessment
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Risk Level</p>
                  <p className="text-lg font-bold text-blue-800 mt-1">{test.mlAnalysis.riskLevel}</p>
                </div>
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                  <p className="text-xs text-teal-600 font-medium uppercase tracking-wider">Wellness Score</p>
                  <p className="text-lg font-bold text-teal-800 mt-1">
                    {test.mlAnalysis.wellnessScore != null ? `${test.mlAnalysis.wellnessScore}/100` : "—"}
                  </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">Risk Segment</p>
                  <p className="text-sm font-medium text-indigo-800 mt-1">{test.mlAnalysis.clusterLabel || "—"}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Answers
            </h2>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              {test.answers.map((ans, idx) => (
                <div key={idx} className={`p-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors duration-150 hover:bg-blue-50`}>
                  <p className="text-gray-700"><span className="font-medium text-teal-600">Q{idx + 1}:</span> {ans}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
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