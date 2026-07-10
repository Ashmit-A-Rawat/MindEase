import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";   // ✅ add this
import api from "../../lib/api.js";
import AppointmentCard from "../../components/AppointmentCard.jsx";
// Subpath imports, not the barrel (`@tabler/icons-react`) — the barrel
// re-exports thousands of icons from one file, which esbuild/Vite's
// dependency pre-bundler hangs on indefinitely trying to process.
import IconFilter from "@tabler/icons-react/dist/esm/icons/IconFilter.mjs";
import IconSearch from "@tabler/icons-react/dist/esm/icons/IconSearch.mjs";
import IconCalendar from "@tabler/icons-react/dist/esm/icons/IconCalendar.mjs";
import IconClock from "@tabler/icons-react/dist/esm/icons/IconClock.mjs";
import IconRefresh from "@tabler/icons-react/dist/esm/icons/IconRefresh.mjs";
import IconChartBar from "@tabler/icons-react/dist/esm/icons/IconChartBar.mjs";
import IconTrendingUp from "@tabler/icons-react/dist/esm/icons/IconTrendingUp.mjs";
import IconInfoCircle from "@tabler/icons-react/dist/esm/icons/IconInfoCircle.mjs";
import IconSortAscending from "@tabler/icons-react/dist/esm/icons/IconSortAscending.mjs";
import IconChevronDown from "@tabler/icons-react/dist/esm/icons/IconChevronDown.mjs";
import IconLoader from "@tabler/icons-react/dist/esm/icons/IconLoader.mjs";
import IconAlertCircle from "@tabler/icons-react/dist/esm/icons/IconAlertCircle.mjs";
import IconX from "@tabler/icons-react/dist/esm/icons/IconX.mjs";

export default function MyAppointments() {
  const { studentId } = useParams();   // ✅ grab studentId from route
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const calculateStats = useCallback((appts) => {
    setStats({
      total: appts.length,
      upcoming: appts.filter(a => ["Booked","Confirmed","Pending"].includes(a.status)).length,
      completed: appts.filter(a => a.status === "Completed").length,
      cancelled: appts.filter(a => a.status === "Cancelled").length,
    });
  }, []);

  const fetchAppointments = useCallback(async (isRefresh = false) => {
    if (!studentId) return;   // ✅ safety check
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      // ✅ Fetch only this student's appointments
      const response = await api.get(`/appointments/student/${studentId}`);

      if (Array.isArray(response.data)) {
        setAppointments(response.data);
        calculateStats(response.data);
      } else {
        throw new Error("Invalid data from server");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load appointments.");
      setAppointments([]);
      calculateStats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, calculateStats]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]); 

  const markCompleted = async (appt) => {
    const original = [...appointments];
    try {
      const updated = appointments.map((a) =>
        a._id === appt._id ? { ...a, status: "Completed" } : a
      );
      setAppointments(updated);
      calculateStats(updated);
      await api.put(`/appointments/${appt._id}`, {
        status: "Completed",
        completedAt: new Date().toISOString(),
      });
    } catch {
      setAppointments(original);
      calculateStats(original);
      setError("Failed to mark as completed.");
    }
  };

  const cancelAppointment = async (appt) => {
    const original = [...appointments];
    try {
      const updated = appointments.map((a) =>
        a._id === appt._id ? { ...a, status: "Cancelled" } : a
      );
      setAppointments(updated);
      calculateStats(updated);
      await api.put(`/appointments/${appt._id}`, {
        status: "Cancelled",
        cancelledAt: new Date().toISOString(),
      });
    } catch {
      setAppointments(original);
      calculateStats(original);
      setError("Failed to cancel appointment.");
    }
  };

  const rescheduleAppointment = async (appt, newDate, newTime) => {
    const original = [...appointments];
    try {
      const updated = appointments.map((a) =>
        a._id === appt._id
          ? { ...a, date: newDate, time: newTime, status: "Confirmed" }
          : a
      );
      setAppointments(updated);
      await api.put(`/appointments/${appt._id}`, {
        date: newDate,
        time: newTime,
        status: "Confirmed",
      });
    } catch {
      setAppointments(original);
      setError("Failed to reschedule.");
    }
  };

  const refreshAppointments = () => {
    fetchAppointments(true);
  };

  // Filtering & sorting
  const filteredAppointments = appointments.filter((appt) => {
    let statusMatch = true;
    if (filter === "upcoming")
      statusMatch = ["Booked", "Confirmed", "Pending"].includes(appt.status);
    else if (filter === "completed") statusMatch = appt.status === "Completed";
    else if (filter === "cancelled") statusMatch = appt.status === "Cancelled";

    const searchMatch =
      !searchTerm ||
      (appt.studentName &&
        appt.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.notes &&
        appt.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.counsellor &&
        appt.counsellor.toLowerCase().includes(searchTerm.toLowerCase()));
    return statusMatch && searchMatch;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (sortBy === "date") {
      return sortOrder === "asc"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date);
    } else if (sortBy === "name") {
      return sortOrder === "asc"
        ? (a.studentName || "").localeCompare(b.studentName || "")
        : (b.studentName || "").localeCompare(a.studentName || "");
    } else if (sortBy === "status") {
      return sortOrder === "asc"
        ? (a.status || "").localeCompare(b.status || "")
        : (b.status || "").localeCompare(a.status || "");
    }
    return 0;
  });

  const toggleSortOrder = () =>
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <IconLoader className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <IconAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshAppointments}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
          <IconAlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          My Appointments
        </h1>
        <p className="text-gray-600">Manage your scheduled counseling sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, color: "blue", icon: IconCalendar },
          { label: "Upcoming", value: stats.upcoming, color: "green", icon: IconClock },
          { label: "Completed", value: stats.completed, color: "teal", icon: IconChartBar },
          { label: "Cancelled", value: stats.cancelled, color: "rose", icon: IconTrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-4 shadow-md border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                <p className="text-sm text-gray-600">{label}</p>
              </div>
              <div className={`p-2 bg-${color}-100 rounded-lg`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl p-4 shadow-md mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by student name, notes, or counsellor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
            onClick={toggleSortOrder}
          >
            <IconSortAscending className="w-4 h-4" />
            <span>
              Sort: {sortBy} ({sortOrder})
            </span>
            <IconChevronDown className="w-3 h-3" />
          </button>

          <button
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={refreshAppointments}
            disabled={refreshing}
            title="Refresh"
          >
            <IconRefresh
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {["all", "upcoming", "completed", "cancelled"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === tab
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments */}
      {sortedAppointments.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconInfoCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {searchTerm
              ? "No matching appointments found"
              : "No appointments scheduled"}
          </h3>
          <p className="text-gray-500 mb-4">
            {filter === "cancelled"
              ? "No cancelled appointments."
              : filter === "completed"
              ? "No completed sessions yet."
              : filter === "upcoming"
              ? "No upcoming appointments."
              : "You have no appointments yet."}
          </p>
          {searchTerm && (
            <button
              className="text-indigo-600 hover:text-indigo-800 font-medium"
              onClick={() => setSearchTerm("")}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAppointments.map((appt, index) => (
            <div
              key={appt._id || index}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <AppointmentCard
                appointment={appt}
                onComplete={
                  ["Pending", "Confirmed"].includes(appt.status)
                    ? markCompleted
                    : null
                }
                onCancel={
                  ["Booked", "Confirmed", "Pending"].includes(appt.status)
                    ? cancelAppointment
                    : null
                }
                onReschedule={
                  ["Booked", "Confirmed"].includes(appt.status)
                    ? rescheduleAppointment
                    : null
                }
                actionLabel={
                  appt.status === "Pending" ? "Mark Completed" : null
                }
                otherPartyName={appt.counsellorName}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
