import { Outlet, useParams } from "react-router-dom";
import AppSidebar from "../../components/Sidebar.jsx";
import { useEffect, useState } from "react";
import api from "../../lib/api.js";

export default function CounsellorDashboard() {
  const { counsellorId } = useParams();
  const [counsellor, setCounsellor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounsellorData = async () => {
      try {
        const response = await api.get(`/counsellors/${counsellorId}`);
        setCounsellor(response.data);
      } catch (err) {
        console.error("Error fetching counsellor data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounsellorData();
  }, [counsellorId]);

  if (loading) {
    return (
      <AppSidebar role="counsellor" id={counsellorId}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar role="counsellor" id={counsellorId}>
      {/* Simple Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-800 mb-2">
              Counsellor Dashboard
            </h1>
            <p className="text-indigo-600">
              Welcome back, <span className="font-semibold">{counsellor?.fullName}</span>
            </p>
          </div>
          
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl font-bold">
            {counsellor?.fullName?.charAt(0) || 'C'}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6">
        <Outlet context={{ counsellor }} />
      </div>
    </AppSidebar>
  );
}