import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api.js";
import AppointmentCard from "../../components/AppointmentCard.jsx";
import { 
  IconSearch, 
  IconCalendar, 
  IconClock,
  IconRefresh,
  IconChartBar,
  IconTrendingUp,
  IconInfoCircle,
  IconSortAscending,
  IconChevronDown,
  IconLoader,
  IconAlertCircle,
  IconX
} from "@tabler/icons-react";

export default function MyAppointments() {
  const { counsellorId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch appointments from API
  const fetchAppointments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const url = `/appointments/counsellor/${counsellorId}`;
      const response = await api.get(url);

      if (response.data && Array.isArray(response.data)) {
        setAppointments(response.data);
        calculateStats(response.data);
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(err.response?.data?.message || "Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate statistics
  const calculateStats = (appts) => {
    const statsData = {
      total: appts.length,
      upcoming: appts.filter(a => ["Booked","Confirmed","Pending"].includes(a.status)).length,
      completed: appts.filter(a => a.status === "Completed").length,
      cancelled: appts.filter(a => a.status === "Cancelled").length
    };
    setStats(statsData);
  };

  // Initial data fetch
  useEffect(() => {
    fetchAppointments();
  }, [counsellorId]);

  // Mark appointment as completed
  const markCompleted = async (appt) => {
    try {
      const originalAppointments = [...appointments];
      const updatedAppointments = appointments.map(a => a._id === appt._id ? { ...a, status: "Completed" } : a);
      setAppointments(updatedAppointments);
      calculateStats(updatedAppointments);

      await api.put(`/appointments/${appt._id}`, { status: "Completed", completedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Error completing appointment:", err);
      setError("Failed to complete appointment. Please try again.");
      setAppointments(originalAppointments);
      calculateStats(originalAppointments);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (appt) => {
    try {
      const originalAppointments = [...appointments];
      const updatedAppointments = appointments.map(a => a._id === appt._id ? { ...a, status: "Cancelled" } : a);
      setAppointments(updatedAppointments);
      calculateStats(updatedAppointments);

      await api.put(`/appointments/${appt._id}`, { status: "Cancelled", cancelledAt: new Date().toISOString() });
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      setError("Failed to cancel appointment. Please try again.");
      setAppointments(originalAppointments);
      calculateStats(originalAppointments);
    }
  };

  // Refresh appointments
  const refreshAppointments = () => {
    fetchAppointments(true);
  };

  // Filter and sort appointments
  const filteredAppointments = appointments.filter(appt => {
    let statusMatch = true;
    if (filter === "upcoming") statusMatch = ["Booked","Confirmed","Pending"].includes(appt.status);
    else if (filter === "completed") statusMatch = appt.status === "Completed";
    else if (filter === "cancelled") statusMatch = appt.status === "Cancelled";

    const searchMatch = searchTerm === "" ||
      (appt.studentName && appt.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.notes && appt.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.counsellor && appt.counsellor.toLowerCase().includes(searchTerm.toLowerCase()));

    return statusMatch && searchMatch;
  });

  const sortedAppointments = [...filteredAppointments].sort((a,b) => {
    if (sortBy === "date") return sortOrder === "asc" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
    else if (sortBy === "name") return sortOrder === "asc" ? (a.studentName||"").localeCompare(b.studentName||"") : (b.studentName||"").localeCompare(a.studentName||"");
    else if (sortBy === "status") return sortOrder === "asc" ? (a.status||"").localeCompare(b.status||"") : (b.status||"").localeCompare(a.status||"");
    return 0;
  });

  const toggleSortOrder = () => setSortOrder(sortOrder === "asc" ? "desc" : "asc");

  if (loading) return (
    <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <IconLoader className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading appointments...</p>
      </div>
    </div>
  );

  if (error && appointments.length === 0) return (
    <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <IconAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={refreshAppointments} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
          <IconAlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My Appointments</h1>
        <p className="text-gray-600">Manage your scheduled counseling sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div><p className="text-2xl font-bold text-blue-600">{stats.total}</p><p className="text-sm text-gray-600">Total</p></div>
            <div className="p-2 bg-blue-100 rounded-lg"><IconCalendar className="w-5 h-5 text-blue-600" /></div>
          </div>
        </div>
        <div className="stat-card bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div><p className="text-2xl font-bold text-green-600">{stats.upcoming}</p><p className="text-sm text-gray-600">Upcoming</p></div>
            <div className="p-2 bg-green-100 rounded-lg"><IconClock className="w-5 h-5 text-green-600" /></div>
          </div>
        </div>
        <div className="stat-card bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div><p className="text-2xl font-bold text-teal-600">{stats.completed}</p><p className="text-sm text-gray-600">Completed</p></div>
            <div className="p-2 bg-teal-100 rounded-lg"><IconChartBar className="w-5 h-5 text-teal-600" /></div>
          </div>
        </div>
        <div className="stat-card bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div><p className="text-2xl font-bold text-rose-600">{stats.cancelled}</p><p className="text-sm text-gray-600">Cancelled</p></div>
            <div className="p-2 bg-rose-100 rounded-lg"><IconTrendingUp className="w-5 h-5 text-rose-600" /></div>
          </div>
        </div>
      </div>

      {/* Search / Filter */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by student name or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm" onClick={toggleSortOrder}>
              <IconSortAscending className="w-4 h-4" />
              <span>Sort: {sortBy === "date" ? "Date" : sortBy === "name" ? "Name" : "Status"} ({sortOrder})</span>
              <IconChevronDown className="w-3 h-3" />
            </button>
          </div>
          <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50" onClick={refreshAppointments} disabled={refreshing} title="Refresh appointments">
            <IconRefresh className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {["all", "upcoming", "completed", "cancelled"].map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter===tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Grid */}
      <div>
        {sortedAppointments.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconInfoCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchTerm ? "No matching appointments found" : "No appointments scheduled"}
            </h3>
            <p className="text-gray-500 mb-4">
              {filter === "cancelled" ? "You don't have any cancelled appointments" :
               filter === "completed" ? "You haven't completed any sessions yet" :
               filter === "upcoming" ? "You don't have any upcoming appointments" :
               "You don't have any appointments scheduled yet"}
            </p>
            {searchTerm && <button className="text-indigo-600 hover:text-indigo-800 font-medium" onClick={() => setSearchTerm("")}>Clear search</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedAppointments.map((appt, index) => (
              <div key={appt._id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <AppointmentCard
                  appointment={appt}
                  onComplete={appt.status==="Pending"||appt.status==="Confirmed" ? markCompleted : null}
                  onCancel={["Booked","Confirmed","Pending"].includes(appt.status) ? cancelAppointment : null}
                  actionLabel={appt.status==="Pending" ? "Mark Completed" : null}
                  otherPartyName={appt.studentName}
                  showCallSummary
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
