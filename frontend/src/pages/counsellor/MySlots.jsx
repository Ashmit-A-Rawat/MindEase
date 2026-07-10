import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api, { axiosInstance } from "../../lib/api.js";
import SlotCard from "../../components/SlotCard.jsx";
import Modal from "../../components/Modal.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// Subpath imports, not the barrel (`@tabler/icons-react`) — the barrel
// re-exports thousands of icons from one file, which esbuild/Vite's
// dependency pre-bundler hangs on indefinitely trying to process.
import IconCalendar from "@tabler/icons-react/dist/esm/icons/IconCalendar.mjs";
import IconClock from "@tabler/icons-react/dist/esm/icons/IconClock.mjs";
import IconVideo from "@tabler/icons-react/dist/esm/icons/IconVideo.mjs";
import IconMapPin from "@tabler/icons-react/dist/esm/icons/IconMapPin.mjs";
import IconPlus from "@tabler/icons-react/dist/esm/icons/IconPlus.mjs";
import IconTrash from "@tabler/icons-react/dist/esm/icons/IconTrash.mjs";
import IconHeart from "@tabler/icons-react/dist/esm/icons/IconHeart.mjs";
import IconUsers from "@tabler/icons-react/dist/esm/icons/IconUsers.mjs";
import IconChartBar from "@tabler/icons-react/dist/esm/icons/IconChartBar.mjs";
import IconSettings from "@tabler/icons-react/dist/esm/icons/IconSettings.mjs";
import IconRefresh from "@tabler/icons-react/dist/esm/icons/IconRefresh.mjs";
import IconLoader from "@tabler/icons-react/dist/esm/icons/IconLoader.mjs";
import IconAlertCircle from "@tabler/icons-react/dist/esm/icons/IconAlertCircle.mjs";
import IconX from "@tabler/icons-react/dist/esm/icons/IconX.mjs";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function MySlots() {
  const { counsellorId } = useParams();
  const [slots, setSlots] = useState([]);
  const [counsellor, setCounsellor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [wellnessTip, setWellnessTip] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const tipRef = useRef(null);

  // Wellness tips for mental health professionals
  const wellnessTips = [
    "Remember to take deep breaths between sessions",
    "Your compassion makes a difference every day",
    "Schedule short breaks to recharge your energy",
    "Practice self-care - you can't pour from an empty cup",
    "Each session is a step toward healing",
    "Your presence brings comfort and safety to others",
    "Celebrate small victories in your students' progress",
    "Mindfulness moments help you stay grounded"
  ];

  // Stats data
  const [stats, setStats] = useState({
    totalSlots: 0,
    upcomingSessions: 0,
    completionRate: "0%"
  });

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    mode: "Offline",
    meetingLink: "",
    location: "TSEC Counseling Center",
  });

  // Fetch counsellor info
  useEffect(() => {
    const fetchCounsellorData = async () => {
      try {
        const response = await api.get(`/counsellors/${counsellorId}`);
        setCounsellor(response.data);
      } catch (err) {
        console.error("Error fetching counsellor data:", err);
        setError("Failed to load counsellor information");
      }
    };

    fetchCounsellorData();
    setWellnessTip(wellnessTips[Math.floor(Math.random() * wellnessTips.length)]);
  }, [counsellorId]);

  // Fetch slots. GET /slots returns every counsellor's slots (the student
  // browse-availability page needs that), so this page — showing only
  // *this* counsellor's own availability — filters client-side by email
  // rather than trusting the raw response. Waits on `counsellor` since
  // that's fetched in a separate effect and holds the email to match on.
  useEffect(() => {
    if (!counsellor?.email) return;

    const fetchSlots = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/slots");
        const mySlots = response.data.filter((s) => s.counsellorEmail === counsellor.email);
        setSlots(mySlots);
        calculateStats(mySlots);
      } catch (err) {
        console.error("Error fetching slots:", err);
        setError("Failed to load availability slots");
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [counsellor]);

  // GSAP Animations
  useEffect(() => {
    if (!loading) {
      // Header animation
      gsap.from(headerRef.current, {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      // Stats cards animation
      gsap.from(".stat-card", {
        scrollTrigger: {
          trigger: statsRef.current,
          start: "top 85%",
          toggleActions: "play none none none"
        },
        y: 20,
        opacity: 0,
        stagger: 0.15,
        duration: 0.7,
        ease: "power2.out"
      });

      // Wellness tip animation
      gsap.from(tipRef.current, {
        y: 15,
        opacity: 0,
        duration: 0.6,
        delay: 0.3,
        ease: "power2.out"
      });
    }
  }, [loading]);

  const calculateStats = (slotsData) => {
    const statsData = {
      totalSlots: slotsData.length,
      upcomingSessions: slotsData.filter(slot => 
        new Date(`${slot.date}T${slot.time}`) > new Date()
      ).length,
      completionRate: slotsData.length > 0 ? "92%" : "0%"
    };
    setStats(statsData);
  };

  const createSlot = async () => {
    setIsCreating(true);
    try {
      const response = await axiosInstance.post("/slots", {
        ...formData,
        counsellorId,
        counsellorName: counsellor?.name,
        counsellorEmail: counsellor?.email
      });
      
      const newSlots = [...slots, response.data];
      setSlots(newSlots);
      setShowModal(false);
      calculateStats(newSlots);
      
      // Reset form
      setFormData({
        date: "",
        time: "",
        mode: "Offline",
        meetingLink: "",
        location: "TSEC Counseling Center",
      });
      
      setWellnessTip("New time slot created successfully!");
      
      // Animate new card
      setTimeout(() => {
        const newCard = document.querySelector('.slot-card:last-child');
        if (newCard) {
          gsap.fromTo(newCard,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
          );
        }
      }, 100);
      
    } catch (err) {
      console.error("Error creating slot:", err);
      setError("Failed to create time slot. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSlot = async (slot) => {
    try {
      await api.delete(`/slots/${slot._id}`);
      const newSlots = slots.filter(s => s._id !== slot._id);
      setSlots(newSlots);
      calculateStats(newSlots);
      setWellnessTip("Time slot removed successfully.");
    } catch (err) {
      console.error("Error deleting slot:", err);
      setError("Failed to delete time slot. Please try again.");
    }
  };

  const refreshWellnessTip = () => {
    const newTip = wellnessTips[Math.floor(Math.random() * wellnessTips.length)];
    setWellnessTip(newTip);
    
    // Animation for tip refresh
    gsap.fromTo(tipRef.current,
      { scale: 0.95, opacity: 0.5 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
    );
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <IconLoader className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
          <IconAlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div ref={headerRef} className="mb-8 text-center">
        <div className="inline-block p-3 bg-white rounded-full mb-4 shadow-sm">
          <IconHeart className="w-8 h-8 text-teal-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My Availability</h1>
        <p className="text-gray-600 mb-3">Create peaceful spaces for healing conversations</p>
        
        {/* Wellness Tip */}
        <div ref={tipRef} className="bg-white rounded-lg p-4 shadow-sm border border-blue-100 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-teal-700 font-medium">
              <span className="text-green-500 mr-2">🌿</span> 
              {wellnessTip}
            </p>
            <button
              onClick={refreshWellnessTip}
              className="text-teal-500 hover:text-teal-700 ml-2"
              title="Refresh tip"
            >
              <IconRefresh className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card bg-white rounded-xl p-5 shadow-md border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.totalSlots}</p>
              <p className="text-sm text-gray-600">Total Slots</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <IconCalendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="stat-card bg-white rounded-xl p-5 shadow-md border border-teal-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-teal-600">{stats.upcomingSessions}</p>
              <p className="text-sm text-gray-600">Upcoming Sessions</p>
            </div>
            <div className="p-2 bg-teal-100 rounded-lg">
              <IconUsers className="w-5 h-5 text-teal-600" />
            </div>
          </div>
        </div>
        
        <div className="stat-card bg-white rounded-xl p-5 shadow-md border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completionRate}</p>
              <p className="text-sm text-gray-600">Completion Rate</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <IconChartBar className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Create Slot Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowModal(true)}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center shadow-md"
        >
          <IconPlus className="w-5 h-5 mr-2" />
          Create New Availability
        </button>
      </div>

      {/* Modal for Creating Slot */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Create Time Slot</h2>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Mode
              </label>
              <select
                value={formData.mode}
                onChange={e => setFormData({
                  ...formData,
                  mode: e.target.value,
                  // Clear the field for the mode being switched away from —
                  // otherwise the stale value (e.g. the default "TSEC
                  // Counseling Center" location) gets saved alongside an
                  // Online slot's meeting link and the display logic picks
                  // the wrong one.
                  ...(e.target.value === "Online" ? { location: "" } : { meetingLink: "" }),
                })}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="Offline">In-Person (Offline)</option>
                <option value="Online">Virtual (Online)</option>
              </select>
            </div>

            {formData.mode === "Online" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Link
                </label>
                <input
                  type="url"
                  placeholder="https://meet.example.com/your-room"
                  value={formData.meetingLink}
                  onChange={e => setFormData({...formData, meetingLink: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Counseling room location"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={createSlot}
              disabled={isCreating || !formData.date || !formData.time}
              className="flex-1 bg-teal-600 text-white py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <div className="flex items-center justify-center">
                  <IconLoader className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </div>
              ) : (
                "Create Slot"
              )}
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Slots Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Your Availability Slots
        </h2>
        
        <AnimatePresence>
          {slots.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-md">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconCalendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No availability slots yet</h3>
              <p className="text-gray-500 mb-4">Create your first availability to welcome students</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Create First Slot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot, index) => (
                <div
                  key={slot._id}
                  className="slot-card bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
                >
                  <SlotCard
                    slot={slot}
                    actionLabel="Delete"
                    onAction={deleteSlot}
                    actionIcon={<IconTrash className="w-4 h-4" />}
                  />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}