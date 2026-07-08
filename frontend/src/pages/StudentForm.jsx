// src/pages/student/StudentForm.jsx
import { useState, useRef, useEffect } from "react";
import * as Toast from "@radix-ui/react-toast";
import axios from "axios";
import { MdDelete } from "react-icons/md";
import { useAuth } from "../contexts/useAuth.js";
import { useNavigate } from "react-router-dom";

const FASTAPI_VERIFY_URL = `${import.meta.env.VITE_STUDENT_VERIFICATION_URL || "http://localhost:8000"}/verify`;      // FastAPI -> expects JSON with name, college_name, academic_year, dob
const NODE_UPDATE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5001/api1"}/users/update`;   // Node -> expects multipart/form-data + verification JSON (stringified)

const StudentForm = () => {
  const { currentUser, fetchUser, setUserFromResponse } = useAuth();
  const navigate = useNavigate();

  const [openToast, setOpenToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [loading, setLoading] = useState(false);

  const [profilePreview, setProfilePreview] = useState(null);
  const [idPreview, setIdPreview] = useState(null);

  const profileInputRef = useRef(null);
  const idInputRef = useRef(null);

  useEffect(() => {
    // If already verified, send to dashboard
    if (currentUser && currentUser.isVerified) {
      const id = currentUser._id || currentUser.id;
      if (id) navigate(`/student/${id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const getAcademicYears = () => {
    const currentYear = new Date().getFullYear() - 2;
    const currentMonth = new Date().getMonth() + 1;
    const startYear = currentMonth >= 6 ? currentYear : currentYear - 1;
    return Array.from({ length: 8 }, (_, i) => {
      const year1 = startYear + i;
      const year2 = year1 + 1;
      return `${year1}-${String(year2).slice(-2)}`;
    });
  };

  const handleProfileChange = (e) => {
    const file = e.target.files?.[0];
    setProfilePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleIdChange = (e) => {
    const file = e.target.files?.[0];
    setIdPreview(file ? URL.createObjectURL(file) : null);
  };

  const removeProfile = () => {
    if (profileInputRef.current) profileInputRef.current.value = "";
    setProfilePreview(null);
  };

  const removeId = () => {
    if (idInputRef.current) idInputRef.current.value = "";
    setIdPreview(null);
  };

  const showToast = (type, msg) => {
    setToastType(type);
    setToastMessage(msg);
    setOpenToast(true);
    setTimeout(() => setOpenToast(false), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // require logged-in student
    if (!currentUser) {
      showToast("error", "You must be logged in to verify.");
      return;
    }

    const form = e.target;
    const payload = new FormData();
    payload.append("name",form.name.value);
    payload.append("college_name", form.college_name.value);
    payload.append("academic_year", form.academic_year.value);
    payload.append("dob", form.dob.value);
    payload.append("id_card", form.id_card.files[0]);

    try {
      setLoading(true);

      const fastRes = await axios.post(FASTAPI_VERIFY_URL, payload);

      if (!fastRes?.data) {
        throw new Error("No response from verification service");
      }

      const verification = fastRes.data; 

      // Optional: surface similarity scores to user before continuing (not required)
      // e.g. if verification.similarity_scores.average < threshold, you might warn.
      // But per your flow we continue to upload files and update Node.

      // --- 2) Send files + fields + verification to Node backend which saves files & updates user
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("college_name", payload.college_name);
      formData.append("academic_year", payload.academic_year);
      formData.append("dob", payload.dob);

      // append files if provided
      if (profileInputRef.current?.files?.[0]) {
        formData.append("profile_pic", profileInputRef.current.files[0]);
      }
      if (idInputRef.current?.files?.[0]) {
        formData.append("id_card", idInputRef.current.files[0]);
      }

      // include verification result from FastAPI so Node can decide isVerified
      formData.append("verification", JSON.stringify(verification));
      console.log(formData);
      // Node endpoint requires cookie auth (httpOnly cookie). withCredentials:true sends it.
      const nodeRes = await axios.post(NODE_UPDATE_URL, formData, {
        withCredentials: true,
        //headers: { "Content-Type": "multipart/form-data" },
      });
      console.log(nodeRes.data);

      if (!nodeRes?.data) throw new Error("No response from server");

      if (nodeRes.data.status !== "success") {
        const msg = nodeRes?.data?.message || "Verification update failed";
        showToast("error", msg);
        setLoading(false);
        return;
      }

      // Node returns updated user
      const updatedUser = nodeRes?.data?.user;
      if (updatedUser) {
        setUserFromResponse(updatedUser);
        showToast("success", "✅ Verification completed! Redirecting...");
        const id = updatedUser._id || updatedUser.id || currentUser._id || currentUser.id;
        if (id) navigate(`/student/${id}`);
        else {
          // as fallback fetch user and redirect
          const fetched = await fetchUser();
          const fid = fetched?._id || fetched?.id;
          if (fid) navigate(`/student/${fid}`);
          else navigate("/");
        }
      } else {
        showToast("error", "Verification completed but could not retrieve user.");
      }
    } catch (err) {
      console.error("Verification flow error:", err);
      const msg = err?.response?.data?.message || err.message || "Server error";
      showToast("error", `⚠️ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-lg">
        <h1 className="text-xl font-bold mb-4">Student Verification</h1>
        <p className="text-sm text-blue-600 font-medium mb-3">ℹ️ Fill the details as per your ID CARD</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
            <input
              ref={profileInputRef}
              name="profile_pic"
              type="file"
              accept="image/*"
              onChange={handleProfileChange}
              className="mt-1 block w-full text-sm text-gray-500"
            />
            {/*<p className="text-xs text-gray-500 mt-1">Optional but recommended — helps identification</p>*/}

            {profilePreview && (
              <div className="mt-3 flex items-center justify-between">
                <img src={profilePreview} alt="profile preview" className="w-40 h-40 object-cover rounded-full border" />
                <button type="button" onClick={removeProfile} className="ml-3 px-2 py-1 text-red-600">Remove</button>
              </div>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              name="name"
              type="text"
              defaultValue={""}
              required
              placeholder="Enter your full name"
              className="mt-1 block w-full rounded-md border border-gray-300 p-2"
            />
          </div>

          {/* Email readonly */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              name="email_display"
              type="email"
              defaultValue={currentUser?.email || ""}
              readOnly
              className="mt-1 block w-full rounded-md border border-gray-200 p-2 bg-gray-50 text-gray-600"
            />
          </div>

          {/* College Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">College Name</label>
            <input
              name="college_name"
              type="text"
              required
              placeholder="Enter your college name"
              className="mt-1 block w-full rounded-md border border-gray-300 p-2"
            />
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Academic Year</label>
            <select name="academic_year" required className="mt-1 block w-full rounded-md border border-gray-300 p-2">
              {getAcademicYears().map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input name="dob" type="date" required className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
          </div>

          {/* ID Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload College ID</label>
            <input
              ref={idInputRef}
              name="id_card"
              type="file"
              accept="image/*"
              required
              onChange={handleIdChange}
              className="mt-1 block w-full text-sm text-gray-500"
            />
            {idPreview && (
              <div className="mt-3">
                <img src={idPreview} alt="id preview" className="w-full rounded-lg mb-2 border" />
                <button type="button" onClick={removeId} className="text-red-600">Remove ID</button>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className={`w-full py-2 rounded-lg ${loading ? "bg-gray-400 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
            {loading ? "Submitting verification..." : "Submit"}
          </button>
        </form>
      </div>

      {/* Toast */}
      <Toast.Provider swipeDirection="right">
        <Toast.Root className={`fixed bottom-5 right-5 rounded-md px-4 py-3 shadow-lg ${toastType === "success" ? "bg-green-600" : "bg-red-600"} text-white`} open={openToast} onOpenChange={setOpenToast}>
          <Toast.Title>{toastMessage}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport />
      </Toast.Provider>
    </div>
  );
};

export default StudentForm;
