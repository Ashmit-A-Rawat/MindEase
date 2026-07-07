import React, { useEffect, useState } from "react";
import axios from "../../lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const Analysis = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clusters, setClusters] = useState(null);
  const [associations, setAssociations] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const [mlLoading, setMlLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await axios.get("/analysis");
        setData(res.data);
      } catch (error) {
        console.error("Error fetching analysis:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysis();
  }, []);

  useEffect(() => {
    const fetchMlAnalysis = async () => {
      try {
        const [clustersRes, associationsRes, featureRes] = await Promise.allSettled([
          axios.get("/ml/clusters"),
          axios.get("/ml/associations"),
          axios.get("/ml/feature-importance"),
        ]);
        if (clustersRes.status === "fulfilled") setClusters(clustersRes.value.data.clusters);
        if (associationsRes.status === "fulfilled") setAssociations(associationsRes.value.data.rules);
        if (featureRes.status === "fulfilled") setFeatureImportance(featureRes.value.data.feature_importance);
      } catch (error) {
        console.error("Error fetching ML analysis:", error);
      } finally {
        setMlLoading(false);
      }
    };
    fetchMlAnalysis();
  }, []);

  const CLUSTER_COLORS = ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];

  // Soothing color palette
  const SEVERITY_COLORS = {
    Minimal: "#4CAF50",    // Green
    Mild: "#FFC107",       // Amber
    Moderate: "#FF9800",   // Orange
    Severe: "#F44336"      // Red
  };

  const COLORS = [SEVERITY_COLORS.Minimal, SEVERITY_COLORS.Mild, SEVERITY_COLORS.Moderate, SEVERITY_COLORS.Severe];

  const getTestTitle = (testType) => {
    const titles = {
      PHQ9: "PHQ-9 Depression Assessment",
      GAD7: "GAD-7 Anxiety Assessment",
      GHQ12: "GHQ-12 General Health Questionnaire"
    };
    return titles[testType] || testType;
  };

  const getTestDescription = (testType) => {
    const descriptions = {
      PHQ9: "Measures depression severity based on 9 questions",
      GAD7: "Assesses anxiety levels through 7 questions",
      GHQ12: "Evaluates general psychological well-being with 12 questions"
    };
    return descriptions[testType] || "";
  };

  const renderPieChart = (title, stats) => {
    const chartData = [
      { name: "Minimal", value: stats.Minimal, color: SEVERITY_COLORS.Minimal },
      { name: "Mild", value: stats.Mild, color: SEVERITY_COLORS.Mild },
      { name: "Moderate", value: stats.Moderate, color: SEVERITY_COLORS.Moderate },
      { name: "Severe", value: stats.Severe, color: SEVERITY_COLORS.Severe },
    ];

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-blue-50 transition-all duration-300 hover:shadow-md">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{getTestDescription(Object.keys(data).find(key => data[key] === stats))}</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartData} 
                  dataKey="value" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60}
                  outerRadius={80} 
                  // Removed the label prop that showed percentages
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                {/* Removed Tooltip component to remove student count on hover */}
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="w-full md:w-1/2 pl-0 md:pl-4 mt-4 md:mt-0">
            <div className="space-y-3">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Total</span>
                  <span className="text-sm font-bold text-blue-600">{total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    if (!data) return null;
    
    const barData = [
      {
        name: 'Minimal',
        PHQ9: data.PHQ9.Minimal,
        GAD7: data.GAD7.Minimal,
        GHQ12: data.GHQ12.Minimal,
      },
      {
        name: 'Mild',
        PHQ9: data.PHQ9.Mild,
        GAD7: data.GAD7.Mild,
        GHQ12: data.GHQ12.Mild,
      },
      {
        name: 'Moderate',
        PHQ9: data.PHQ9.Moderate,
        GAD7: data.GAD7.Moderate,
        GHQ12: data.GHQ12.Moderate,
      },
      {
        name: 'Severe',
        PHQ9: data.PHQ9.Severe,
        GAD7: data.GAD7.Severe,
        GHQ12: data.GHQ12.Severe,
      },
    ];

    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 col-span-1 md:col-span-3 border border-blue-50">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Comparison Across Assessments</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid ' }}
              />
              <Legend />
              <Bar dataKey="PHQ9" name=" Depression" fill={SEVERITY_COLORS.Minimal} radius={[4, 4, 0, 0]} />
              <Bar dataKey="GAD7" name=" Anxiety" fill={SEVERITY_COLORS.Moderate} radius={[4, 4, 0, 0]} />
              <Bar dataKey="GHQ12" name=" Stress" fill={SEVERITY_COLORS.Severe} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-400 rounded-full mb-4"></div>
          <p className="text-blue-600 font-medium">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No data available</h3>
          <p className="text-gray-500">Assessment data will appear here once students complete tests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-2">
            Mental Health Analysis
          </h1>
          <p className="text-gray-600">Overview of student assessment results across different mental health dimensions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {data.PHQ9 && renderPieChart("PHQ-9 Depression", data.PHQ9)}
          {data.GAD7 && renderPieChart("GAD-7 Anxiety", data.GAD7)}
          {data.GHQ12 && renderPieChart("GHQ-12 General Health", data.GHQ12)}
        </div>

        {renderBarChart()}

        <div className="mt-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Machine Learning Insights</h2>
          <p className="text-gray-600 text-sm mt-1">Population-level patterns from the risk model, K-Means clustering, and Apriori association mining</p>
        </div>

        {mlLoading ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading ML insights...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {clusters && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-blue-50">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Student Risk Segments</h3>
                <p className="text-sm text-gray-600 mb-4">K-Means clusters from lifestyle + academic factors</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clusters}
                        dataKey="size"
                        nameKey="label"
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={80}
                      >
                        {clusters.map((c, i) => (
                          <Cell key={c.cluster_id} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} students (${props.payload.size_pct}%)`, props.payload.label]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {clusters.map((c, i) => (
                    <div key={c.cluster_id} className="flex items-start justify-between text-sm">
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full mr-2 mt-1 shrink-0" style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}></div>
                        <span className="text-gray-700">{c.label}</span>
                      </div>
                      <span className="font-medium text-gray-900 shrink-0 ml-2">{c.size_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {featureImportance && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-blue-50">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Top Contributing Factors</h3>
                <p className="text-sm text-gray-600 mb-4">Random Forest feature importance for risk prediction</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureImportance} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis type="category" dataKey="feature" width={110} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="importance" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {!mlLoading && associations?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-blue-50 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Risk Factor Associations</h3>
            <p className="text-sm text-gray-600 mb-4">Apriori-mined combinations most strongly linked to elevated risk</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="pb-2 pr-4">If a student has</th>
                    <th className="pb-2 pr-4">Then</th>
                    <th className="pb-2 pr-4">Confidence</th>
                    <th className="pb-2">Lift</th>
                  </tr>
                </thead>
                <tbody>
                  {associations.slice(0, 10).map((rule, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-blue-50">
                      <td className="py-2 pr-4 text-gray-700">{rule.antecedents.join(", ")}</td>
                      <td className="py-2 pr-4 text-gray-700">{rule.consequents.join(", ")}</td>
                      <td className="py-2 pr-4 text-gray-900 font-medium">{Math.round(rule.confidence * 100)}%</td>
                      <td className="py-2 text-gray-900 font-medium">{rule.lift.toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About These Assessments
          </h3>
          <p className="text-blue-700 text-sm">
            These standardized assessments help identify students who may need additional mental health support. 
            The charts show the distribution of severity levels across the student population.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Analysis;