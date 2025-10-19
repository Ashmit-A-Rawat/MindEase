export default function ResultsPage({ result, onRetake }) {
  console.log("ResultsPage received result:", result);

  if (!result) {
    return (
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-red-600 mb-2">Error: No result data available</h2>
        <p className="text-gray-600 mb-4">Please try taking the assessment again.</p>
        <button 
          onClick={onRetake} 
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Take Assessment Again
        </button>
      </div>
    );
  }

  if (!result.analysis) {
    return (
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-red-600 mb-4">Error: Analysis data missing</h2>
        <p className="text-gray-600 mb-4">The assessment completed but analysis data is unavailable.</p>
        <div className="text-left bg-gray-100 p-4 rounded mb-4 text-sm max-h-40 overflow-y-auto">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
        <button 
          onClick={onRetake} 
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Take Assessment Again
        </button>
      </div>
    );
  }
  
  const analysis = result.analysis;
  
  const getRiskColorClasses = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "low risk": 
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-800",
          accent: "text-green-600"
        };
      case "moderate risk": 
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200", 
          text: "text-yellow-800",
          accent: "text-yellow-600"
        };
      case "high risk": 
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          accent: "text-red-600"
        };
      case "critical risk":
        return {
          bg: "bg-red-100",
          border: "border-red-400",
          text: "text-red-900",
          accent: "text-red-700"
        };
      default: 
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-800",
          accent: "text-gray-600"
        };
    }
  };

  const getProgressColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "low risk": return "bg-green-500";
      case "moderate risk": return "bg-yellow-500";
      case "high risk": return "bg-red-500";
      case "critical risk": return "bg-red-700";
      default: return "bg-gray-500";
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "low risk":
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case "moderate risk":
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case "high risk":
      case "critical risk":
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const colors = getRiskColorClasses(analysis.risk_level);
  const isCritical = analysis.risk_level?.toLowerCase().includes("critical") || 
                     analysis.risk_level?.toLowerCase() === "high risk";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Assessment Results</h1>
        <p className="text-gray-600">Based on your responses, here's your mental health assessment</p>
        {result.safety_override && (
          <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
            <p className="text-orange-800 font-medium">Safety protocols have been activated for this assessment</p>
          </div>
        )}
      </div>

      {/* Critical Warning Banner */}
      {isCritical && (
        <div className="bg-red-600 text-white p-6 rounded-2xl shadow-lg animate-pulse">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-12 h-12 mr-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">IMMEDIATE ATTENTION REQUIRED</h2>
              <p className="text-lg">Please seek professional help immediately</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <p className="font-bold">Emergency Services</p>
              <p className="text-2xl font-bold">911</p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <p className="font-bold">Crisis Lifeline</p>
              <p className="text-2xl font-bold">988</p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <p className="font-bold">Crisis Text Line</p>
              <p className="text-lg font-bold">Text HOME to 741741</p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Level Card */}
      <div className={`p-8 rounded-2xl border-2 ${colors.bg} ${colors.border}`}>
        <div className="text-center">
          <div className={`inline-flex items-center justify-center mb-4 ${colors.accent}`}>
            {getRiskIcon(analysis.risk_level)}
          </div>
          <h2 className={`text-3xl font-bold mb-4 ${colors.text}`}>
            {analysis.risk_level || "Assessment Complete"}
          </h2>
          <p className={`text-lg mb-4 ${colors.text}`}>
            {analysis.description || "Assessment completed successfully"}
          </p>
          
          {/* Risk Score Visualization */}
          <div className="mb-4">
            <p className={`text-xl font-semibold mb-2 ${colors.text}`}>
              Risk Score: {analysis.probability_percentage || Math.round((result.probability || 0) * 100)}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${getProgressColor(analysis.risk_level)} transition-all duration-1000`}
                style={{ width: `${analysis.probability_percentage || Math.round((result.probability || 0) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <svg className="w-6 h-6 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Personalized Recommendations
        </h3>
        <div className="space-y-4">
          {analysis.suggestions && analysis.suggestions.length > 0 ? (
            analysis.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-gray-700 leading-relaxed">{suggestion}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center italic">No specific recommendations available</p>
          )}
        </div>
      </div>

      {/* Next Steps */}
      {analysis.next_steps && analysis.next_steps.length > 0 && (
        <div className="bg-blue-50 p-8 rounded-2xl border border-blue-200">
          <h3 className="text-2xl font-bold text-blue-800 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Next Steps
          </h3>
          <div className="space-y-4">
            {analysis.next_steps.map((step, index) => (
              <div key={index} className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-blue-800 leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Professional Resources */}
      {analysis.professional_resources && (
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Professional Resources
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysis.professional_resources.crisis_lines && (
              <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  Crisis Support Lines
                </h4>
                <div className="space-y-2">
                  {analysis.professional_resources.crisis_lines.map((line, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-800 font-medium">{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.professional_resources.online_resources && (
              <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.148.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118z" clipRule="evenodd" />
                  </svg>
                  Online Resources
                </h4>
                <div className="space-y-2">
                  {analysis.professional_resources.online_resources.map((resource, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-800">{resource}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="text-center space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onRetake}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg shadow hover:bg-gray-700 transition-colors font-medium"
          >
            Take Assessment Again
          </button>
          
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors font-medium"
          >
            Print Results
          </button>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-700">Important Disclaimer:</p>
            <p>This assessment is for educational and informational purposes only and does not constitute professional medical advice, diagnosis, or treatment.</p>
            <p>Always seek the advice of qualified mental health professionals with any questions regarding mental health conditions.</p>
            <p>If you are experiencing a mental health emergency, contact emergency services immediately.</p>
          </div>
        </div>

        {/* Assessment Metadata */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>Assessment completed: {new Date().toLocaleString()}</p>
          {result.timestamp && <p>Server timestamp: {new Date(result.timestamp).toLocaleString()}</p>}
          {result.fallback_used && <p>Note: Fallback analysis used (ML service unavailable)</p>}
        </div>
      </div>
    </div>
  );
}