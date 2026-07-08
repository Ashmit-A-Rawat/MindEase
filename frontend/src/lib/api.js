import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api1";
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

const api = axios.create({ baseURL: API_URL });
export default api;


export const axiosInstance = axios.create({
  baseURL : API_URL,
  withCredentials : true,
});


export const signup = async (signupData) => {
  const response = await axiosInstance.post("/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/me");
    return res.data;
  } catch (error) {
    console.log("Error in getAuthUser:", error);
    return null;
  }
};