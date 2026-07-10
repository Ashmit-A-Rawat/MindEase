import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CONCERNING_EMOTIONS = ["sad", "angry", "fear", "disgust"];
const EMOTION_EMOJI = {
  happy: "😊", sad: "😢", angry: "😠", fear: "😨",
  surprise: "😲", disgust: "🤢", neutral: "😐",
};

export default function AppointmentCard({ appointment, onAction, actionLabel, otherPartyName, showCallSummary }) {
  const navigate = useNavigate();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Booked':
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-lg truncate">
            {appointment.studentName || appointment.counsellorName || "Unknown"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
          </p>
        </div>
        <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
          <span className="font-medium">Mode:</span>
          <span className="ml-1">{appointment.mode}</span>
        </div>
        
        <div className="flex items-start text-sm text-gray-600">
          <span className="w-2 h-2 bg-gray-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
          <div>
            <span className="font-medium">
              {appointment.mode === 'Online' ? 'Meeting Link:' : 'Location:'}
            </span>
            <span className="ml-1 break-words">{(appointment.mode === 'Online' ? appointment.meetingLink : appointment.location) || 'Not specified'}</span>
          </div>
        </div>
      </div>
      
      {appointment.mode === "Online" && appointment.status !== "Completed" && appointment.status !== "Cancelled" && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/call/${appointment._id}`, { state: { otherPartyName } })}
          className="w-full mt-4 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Start Video Call
        </motion.button>
      )}

      {showCallSummary && appointment.emotionLog?.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>
              Call Summary
              {appointment.emotionLog.some((e) => CONCERNING_EMOTIONS.includes(e.emotion)) && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                  Flagged moments
                </span>
              )}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {summaryOpen && (
            <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
              {appointment.emotionLog.map((entry, i) => {
                const concerning = CONCERNING_EMOTIONS.includes(entry.emotion);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${concerning ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-600"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{EMOTION_EMOJI[entry.emotion] || "🙂"}</span>
                      <span className="capitalize">{entry.emotion}</span>
                      <span className="text-[10px] opacity-70">({entry.participantRole})</span>
                    </span>
                    <span className="opacity-70">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {actionLabel && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAction(appointment)}
          className="w-full mt-2 bg-red-50 text-red-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}