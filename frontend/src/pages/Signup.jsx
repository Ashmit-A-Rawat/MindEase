import { useState } from "react";
import { signup, BACKEND_URL } from "../lib/api.js";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth.js";

const Signup = () => {
  const { fetchUser, setUserFromResponse } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const extractId = (user) => {
    if (!user) return null;
    return user._id || user.id || user.userId || null;
  };

  const routeAfterSignup = (user) => {
    if (!user) return navigate("/");

    const id = extractId(user);
    const userRole = user.role?.toLowerCase();
    const normalizedRole = userRole === "counselor" ? "counsellor" : userRole;

    if (normalizedRole === "student" && !user.isVerified) {
      return navigate("/student/verify");
    }

    if (id) {
      return navigate(`/${normalizedRole}/${id}`);
    }

    return navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await signup({ name: email, email, password, role });
      let user = res?.user || null;

      // if backend only set cookie and didn't return user, attempt fetch
      if (!user) {
        try {
          user = await fetchUser();
        } catch (fetchErr) {
          console.error("fetchUser fallback failed", fetchErr);
        }
      }

      if (!user) {
        setError("Signup succeeded but user details could not be fetched.");
        setLoading(false);
        return;
      }

      setUserFromResponse(user);

      routeAfterSignup(user);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${BACKEND_URL}/api1/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-8 px-6 text-center">
          <h1 className="text-3xl font-bold text-white">MindEase</h1>
          <p className="text-blue-100 mt-2">Your mental wellness journey starts here</p>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create an Account</h2>

          {/* role selector */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole("student")}
              disabled={loading}
              className={`px-4 py-2 rounded-xl border font-medium ${
                role === "student"
                  ? "border-blue-600 text-blue-600"
                  : "border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600"
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole("counsellor")}
              disabled={loading}
              className={`px-4 py-2 rounded-xl border font-medium ${
                role === "counsellor"
                  ? "border-blue-600 text-blue-600"
                  : "border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600"
              }`}
            >
              Counsellor
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a valid email"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Create a password (min. 6 characters)"
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
              alt="Google logo"
              className="w-5 h-5"
            />
            Sign up with Google
          </button>

          <div className="text-center mt-6">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
