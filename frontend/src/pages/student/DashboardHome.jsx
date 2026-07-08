import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import AppointmentCard from "../../components/AppointmentCard.jsx";
import {
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconX,
  IconCalendar,
  IconMoodSmile,
  IconBrain,
  IconHeartbeat,
} from "@tabler/icons-react";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Mood Check-in Modal Component
const MoodCheckinModal = ({ isOpen, onClose, onSubmit, t }) => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [notes, setNotes] = useState("");
  
  const moodOptions = [
    { id: 1, score: 90, emoji: "😊", label: t("mood.excellent"), description: t("mood.excellentDesc") },
    { id: 2, score: 70, emoji: "🙂", label: t("mood.good"), description: t("mood.goodDesc") },
    { id: 3, score: 50, emoji: "😐", label: t("mood.okay"), description: t("mood.okayDesc") },
    { id: 4, score: 30, emoji: "😕", label: t("mood.notGreat"), description: t("mood.notGreatDesc") },
    { id: 5, score: 10, emoji: "😢", label: t("mood.poor"), description: t("mood.poorDesc") },
  ];

  const moodSuggestions = {
    90: [
      t("moodSuggestions.90.0"),
      t("moodSuggestions.90.1"),
      t("moodSuggestions.90.2")
    ],
    70: [
      t("moodSuggestions.70.0"),
      t("moodSuggestions.70.1"),
      t("moodSuggestions.70.2")
    ],
    50: [
      t("moodSuggestions.50.0"),
      t("moodSuggestions.50.1"),
      t("moodSuggestions.50.2")
    ],
    30: [
      t("moodSuggestions.30.0"),
      t("moodSuggestions.30.1"),
      t("moodSuggestions.30.2")
    ],
    10: [
      t("moodSuggestions.10.0"),
      t("moodSuggestions.10.1"),
      t("moodSuggestions.10.2")
    ]
  };

  const handleSubmit = () => {
    if (selectedMood) {
      onSubmit(selectedMood.score, notes, selectedMood.emoji);
      setSelectedMood(null);
      setNotes("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">{t("moodModal.title")}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <IconX size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">{t("moodModal.selectMood")}</p>
          <div className="grid grid-cols-5 gap-2">
            {moodOptions.map(mood => (
              <button
                key={mood.id}
                className={`flex flex-col items-center p-3 rounded-lg border-2 ${
                  selectedMood?.id === mood.id 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-indigo-300'
                } transition-colors`}
                onClick={() => setSelectedMood(mood)}
              >
                <span className="text-2xl mb-1">{mood.emoji}</span>
                <span className="text-xs text-gray-600">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="notes" className="block text-gray-600 mb-2">
            {t("moodModal.optionalNotes")}
          </label>
          <textarea
            id="notes"
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
            placeholder={t("moodModal.notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        
        {selectedMood && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">{t("moodModal.suggestions")}</h4>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              {moodSuggestions[selectedMood.score].map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        
        <button
          onClick={handleSubmit}
          disabled={!selectedMood}
          className={`w-full py-3 rounded-lg font-medium ${
            selectedMood 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          } transition-colors`}
        >
          {t("moodModal.submitButton")}
        </button>
      </div>
    </div>
  );
};

export default function DashboardHome() {
  const { studentId } = useOutletContext();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // State for mood check-ins
  const [moodCheckins, setMoodCheckins] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem(`moodCheckins_${studentId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  // State for recent mood (last check-in)
  const [recentMood, setRecentMood] = useState(null);
  
  const [wellnessData, setWellnessData] = useState({
    sleepHours: [6.5, 7, 6, 7.5, 8, 7, 7.2],
    stressLevel: 3, // On a scale of 1-10
    energyLevel: 7, // On a scale of 1-10
    lastSession: t("wellness.lastSessionDefault"),
    nextSession: t("wellness.nextSessionDefault"),
  });
  
  const [recentTests, setRecentTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Wellness Profile onboarding nudge — null while unknown, false once we've
  // confirmed no WellnessIntake exists yet for this student. Without it, every
  // ML risk prediction runs on defaults (see ml-service/SCHEMA_MAPPING.md).
  const [hasWellnessProfile, setHasWellnessProfile] = useState(null);
  const [wellnessBannerDismissed, setWellnessBannerDismissed] = useState(
    () => sessionStorage.getItem(`wellnessBannerDismissed_${studentId}`) === "true"
  );

  useEffect(() => {
    if (!studentId) return;
    api.get(`/wellness/${studentId}`)
      .then((res) => setHasWellnessProfile(!!res.data))
      .catch(() => setHasWellnessProfile(null));
  }, [studentId]);

  const dismissWellnessBanner = () => {
    sessionStorage.setItem(`wellnessBannerDismissed_${studentId}`, "true");
    setWellnessBannerDismissed(true);
  };
  
  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Mood modal state
  const [showMoodModal, setShowMoodModal] = useState(false);

  // Save mood check-ins to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`moodCheckins_${studentId}`, JSON.stringify(moodCheckins));
    
    // Set the most recent mood if available
    if (moodCheckins.length > 0) {
      const latestCheckin = moodCheckins[moodCheckins.length - 1];
      setRecentMood(latestCheckin);
    }
  }, [moodCheckins, studentId]);

  // Fetch appointments
  const fetchAppointments = useCallback(async (isRefresh = false) => {
    if (!studentId) return;
    try {
      isRefresh ? setRefreshing(true) : setAppointmentsLoading(true);
      setError(null);

      // Fetch only this student's appointments
      const response = await api.get(`/appointments/student/${studentId}`);

      if (Array.isArray(response.data)) {
        setAppointments(response.data);
        
        // Update next session in wellness data if there are upcoming appointments
        const upcomingAppts = response.data.filter(a => 
          ["Booked","Confirmed","Pending"].includes(a.status)
        ).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (upcomingAppts.length > 0) {
          const nextAppt = upcomingAppts[0];
          const formattedDate = new Date(nextAppt.date).toLocaleDateString();
          setWellnessData(prev => ({
            ...prev,
            nextSession: t("wellness.nextSessionWithCounsellor", {
              date: formattedDate,
              time: nextAppt.time,
              counsellor: nextAppt.counsellor || t("wellness.defaultCounsellor")
            })
          }));
        }
      } else {
        throw new Error("Invalid data from server");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t("errors.loadFailed"));
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
      setRefreshing(false);
    }
  }, [studentId, t]);

  // Fetch recent test reports
  const fetchRecentReports = async () => {
    try {
      const res = await api.get(`/tests/results/${studentId}?limit=3`);
      setRecentTests(res.data.tests || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a new mood check-in
  const addMoodCheckin = (moodScore, notes = "", moodEmoji) => {
    const newCheckin = {
      id: Date.now(),
      date: new Date().toISOString(),
      moodScore,
      notes,
      moodEmoji: moodEmoji || getMoodEmoji(moodScore)
    };
    
    setMoodCheckins(prev => [...prev, newCheckin]);
    return newCheckin;
  };

  // Function to get emoji based on mood score
  const getMoodEmoji = (score) => {
    if (score >= 80) return "😊";
    if (score >= 60) return "🙂";
    if (score >= 40) return "😐";
    if (score >= 20) return "😕";
    return "😢";
  };

  // Function to get mood description based on score
  const getMoodDescription = (score) => {
    if (score >= 80) return t("mood.excellent");
    if (score >= 60) return t("mood.good");
    if (score >= 40) return t("mood.okay");
    if (score >= 20) return t("mood.notGreat");
    return t("mood.poor");
  };

  // Function to handle check-in button click
  const handleCheckInClick = () => {
    setShowMoodModal(true);
  };

  // Function to handle mood submission from modal
  const handleMoodSubmit = (moodScore, notes, moodEmoji) => {
    const newCheckin = addMoodCheckin(moodScore, notes, moodEmoji);
    
    // Show success message
    alert(t("mood.checkinSuccess", { mood: getMoodDescription(moodScore) }));
  };

  useEffect(() => {
    fetchAppointments();
    fetchRecentReports();
  }, [studentId]); 

  const refreshAppointments = () => {
    fetchAppointments(true);
  };

  // Get upcoming appointments (max 2)
  const upcomingAppointments = appointments
    .filter(a => ["Booked","Confirmed","Pending"].includes(a.status))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 2);

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

  // Animation for dashboard elements
  useEffect(() => {
    gsap.utils.toArray(".dashboard-card").forEach((card, i) => {
      gsap.fromTo(card, 
        { y: 50, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          delay: i * 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none none"
          }
        }
      );
    });
  }, [recentTests, appointments, recentMood]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mood Check-in Modal */}
        <MoodCheckinModal 
          isOpen={showMoodModal}
          onClose={() => setShowMoodModal(false)}
          onSubmit={handleMoodSubmit}
          t={t}
        />

        {/* Wellness Profile onboarding nudge */}
        {hasWellnessProfile === false && !wellnessBannerDismissed && (
          <div className="dashboard-card mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-white/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.8 8.6c0 6-8.8 10.4-8.8 10.4S3.2 14.6 3.2 8.6a4.4 4.4 0 0 1 7.6-3.1l1.2 1.3 1.2-1.3a4.4 4.4 0 0 1 7.6 3.1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Complete your Wellness Profile</h3>
                <p className="text-indigo-100 text-sm mt-1">
                  Your test scores alone don't tell the full story. A 2-minute profile (sleep, academic
                  pressure, CGPA, etc.) makes every risk assessment and wellness score you see actually
                  personalized to you, instead of a generic estimate.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate(`/student/${studentId}/wellness-intake`)}
                className="px-5 py-2.5 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
              >
                Complete Profile
              </button>
              <button
                onClick={dismissWellnessBanner}
                className="text-indigo-100 hover:text-white text-sm"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Key Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Recent Mood Card */}
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-600 text-sm">{t("dashboard.metrics.recentMood")}</h3>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <IconMoodSmile className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            
            {recentMood ? (
              <>
                <div className="flex items-end mb-2">
                  <span className="text-4xl mr-2">{recentMood.moodEmoji}</span>
                  <p className="text-2xl font-bold text-gray-800">{recentMood.moodScore}/100</p>
                </div>
                <p className="text-sm font-medium text-gray-700">{getMoodDescription(recentMood.moodScore)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("dashboard.metrics.lastCheckin")}: {new Date(recentMood.date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-end mb-2">
                  <span className="text-4xl mr-2">😊</span>
                  <p className="text-2xl font-bold text-gray-800">--/100</p>
                </div>
                <p className="text-sm font-medium text-gray-700">{t("dashboard.metrics.noCheckins")}</p>
                <p className="text-xs text-gray-500 mt-1">{t("dashboard.metrics.clickToRecord")}</p>
              </>
            )}
          </div>
          
          {/* Other metric cards */}
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-600 text-sm">{t("dashboard.metrics.sleepQuality")}</h3>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              </div>
            </div>
            <div className="flex items-end">
              <p className="text-2xl font-bold text-gray-800">7.2h</p>
              <span className="ml-2 text-sm text-red-600 font-medium flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
                5%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t("dashboard.metrics.nightlyAverage")}</p>
          </div>
          
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-600 text-sm">{t("dashboard.metrics.stressLevel")}</h3>
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <IconBrain className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="flex items-end">
              <p className="text-2xl font-bold text-gray-800">3/10</p>
              <span className="ml-2 text-sm text-green-600 font-medium flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                </svg>
                15%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t("dashboard.metrics.reducedFromLastWeek")}</p>
          </div>
          
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-600 text-sm">{t("dashboard.metrics.nextSession")}</h3>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <IconCalendar className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {wellnessData.nextSession.split(',')[0]}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {wellnessData.nextSession.split(',').slice(1).join(',')}
            </p>
          </div>
        </div>
        
        {/* Charts and Upcoming Sessions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mood History Card */}
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800">{t("dashboard.moodHistory.title")}</h3>
              <span className="text-sm text-gray-500">
                {moodCheckins.length > 0 
                  ? t("dashboard.moodHistory.checkinCount", { count: moodCheckins.length }) 
                  : t("dashboard.moodHistory.noHistory")}
              </span>
            </div>
            
            {moodCheckins.length > 0 ? (
              <div className="h-64 overflow-y-auto">
                <div className="space-y-4">
                  {[...moodCheckins].reverse().map((checkin) => (
                    <div key={checkin.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{checkin.moodEmoji}</span>
                          <div>
                            <h4 className="font-medium text-gray-800">{getMoodDescription(checkin.moodScore)}</h4>
                            <p className="text-sm text-gray-600">{checkin.moodScore}/100</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(checkin.date).toLocaleDateString()}
                        </span>
                      </div>
                      {checkin.notes && (
                        <p className="text-sm text-gray-500 mt-2">{checkin.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                <IconMoodSmile className="h-12 w-12 mb-3 opacity-50" />
                <p>{t("dashboard.moodHistory.noCheckinsYet")}</p>
                <p className="text-sm mt-1">{t("dashboard.moodHistory.historyWillAppear")}</p>
              </div>
            )}
          </div>
          
          {/* Upcoming Sessions */}
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800">{t("dashboard.upcomingSessions.title")}</h3>
              <button 
                onClick={() => navigate(`/student/${studentId}/appointments`)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center"
              >
                {t("common.viewAll")}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {appointmentsLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <IconCalendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">{t("dashboard.upcomingSessions.noSessions")}</p>
                <button 
                  onClick={() => navigate(`/student/${studentId}/appointments`)}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                >
                  {t("dashboard.upcomingSessions.scheduleSession")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appt, index) => (
                  <div 
                    key={appt._id || index} 
                    className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/student/${studentId}/appointments`)}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-800">
                        {t("dashboard.upcomingSessions.sessionWith", { counsellor: appt.counsellor || t("wellness.defaultCounsellor") })}
                      </h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {appt.status}
                      </span>
                    </div>
                    <div className="flex items-center mt-3 text-sm text-gray-600">
                      <IconCalendar className="w-4 h-4 mr-1" />
                      <span>{new Date(appt.date).toLocaleDateString()}</span>
                      <IconHeartbeat className="w-4 h-4 ml-3 mr-1" />
                      <span>{appt.time}</span>
                    </div>
                    {appt.notes && (
                      <p className="text-sm text-gray-500 mt-2 truncate">{appt.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Assessments and Wellness Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Assessments */}
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800">{t("dashboard.recentAssessments.title")}</h3>
              <button 
                onClick={() => navigate(`/student/${studentId}/reports`)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center"
              >
                {t("common.viewAll")}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : recentTests.length === 0 ? (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">{t("dashboard.recentAssessments.noAssessments")}</p>
                <button 
                  onClick={() => navigate(`/student/${studentId}/assessments`)}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                >
                  {t("dashboard.recentAssessments.takeAssessment")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTests.map((test) => (
                  <div 
                    key={test._id} 
                    className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/student/${studentId}/reports/${test._id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-800">{test.testType}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(test.severity)}`}>
                        {test.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-gray-600">{t("common.score")}: {test.score}</p>
                      <p className="text-xs text-gray-500">{new Date(test.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Wellness Tips */}
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800">{t("dashboard.wellnessTips.title")}</h3>
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <IconHeartbeat className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">{t("dashboard.wellnessTips.mindfulBreathing.title")}</h4>
                <p className="text-sm text-blue-700">{t("dashboard.wellnessTips.mindfulBreathing.description")}</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">{t("dashboard.wellnessTips.sleepHygiene.title")}</h4>
                <p className="text-sm text-green-700">{t("dashboard.wellnessTips.sleepHygiene.description")}</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">{t("dashboard.wellnessTips.gratitudePractice.title")}</h4>
                <p className="text-sm text-purple-700">{t("dashboard.wellnessTips.gratitudePractice.description")}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Daily Check-in Prompt */}
        <div className="dashboard-card bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-white mb-2">{t("dashboard.checkinPrompt.title")}</h3>
              <p className="text-indigo-100">
                {recentMood 
                  ? t("dashboard.checkinPrompt.lastCheckin", { mood: getMoodDescription(recentMood.moodScore) })
                  : t("dashboard.checkinPrompt.noCheckin")}
              </p>
            </div>
            <button 
              onClick={handleCheckInClick}
              className="px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {t("dashboard.checkinPrompt.button")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}