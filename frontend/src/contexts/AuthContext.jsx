/* eslint-disable no-unused-vars */
import { createContext, useEffect, useState, useCallback } from "react";
import { axiosInstance, BACKEND_URL } from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // renamed for consistency
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  // useCallback so we can re-use after login/logout
  const fetchUser = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/me"); // uses withCredentials from instance
      const user = res?.data ? {...res.data?.user,token: res.data?.token} : null;
      // backend returns { success: true, user: req.user }
      setCurrentUser(res.data ? user : null);
      setUserType(res.data.user?.role || null);
      setLoading(false);
      return user;
    } catch (err) {
      setCurrentUser(null);
      setUserType(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser(); // run only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // use this in your login page if you don't want to fetch separately
  const setUserFromResponse = (user) => {
    setCurrentUser(user);
    setUserType(user?.role || null);
  };

  const logout = async () => {
    try {
      await axiosInstance.post("/logout"); // backend should clear cookie
    } catch (err) {
      console.error("logout failed", err);
    } finally {
      setCurrentUser(null);
      setUserType(null);
    }
  };

  const googlelogin = () => {
    window.location.href = `${BACKEND_URL}/api1/auth/google`;
  };

  const googlelogout = () => {
    window.location.href = `${BACKEND_URL}/api1/logout`;
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userType,
      loading,
      fetchUser,
      setUserFromResponse,
      logout,
      googlelogin,
      googlelogout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
