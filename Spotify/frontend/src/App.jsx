import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Spotify from "./components/Spotify";

export default function App() {
  const [token, setToken] = useState(undefined);

  useEffect(() => {
    const refreshAccessToken = async (refresh_token) => {
      try {
        console.log("♻️ Refreshing access token...");
        const response = await fetch("http://localhost:5000/api/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token }),
        });

        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
          setToken(data.access_token);

          // Reschedule next refresh
          if (data.expires_in) {
            setTimeout(
              () => refreshAccessToken(refresh_token),
              (data.expires_in - 60) * 1000
            );
          }
        } else {
          console.error("Failed to refresh token:", data);
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          setToken(null);
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        setToken(null);
      }
    };

    const exchangeCodeForToken = async (code) => {
      try {
        console.log("Exchanging code for token...");

        // 🚀 remove code from URL right away to prevent reuse
        window.history.replaceState({}, document.title, window.location.pathname);

        const response = await fetch("http://localhost:5000/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const { access_token, refresh_token, expires_in } = data;

        if (access_token) {
          console.log("✅ Token received successfully");
          localStorage.setItem("token", access_token);
          if (refresh_token) localStorage.setItem("refresh_token", refresh_token);

          setToken(access_token);

          // Schedule refresh
          if (refresh_token && expires_in) {
            setTimeout(
              () => refreshAccessToken(refresh_token),
              (expires_in - 60) * 1000
            );
          }
        }
      } catch (error) {
        console.error("Error exchanging code for token:", error);
      }
    };

    // --- Flow ---
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      console.error("Error from Spotify:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      console.log("🎯 Authorization code received:", code);
      exchangeCodeForToken(code);
      return;
    }

    const localToken = localStorage.getItem("token");
    const localRefresh = localStorage.getItem("refresh_token");

    if (localToken) {
      console.log("Token found in localStorage");
      setToken(localToken);

      // keep refreshing if we have a refresh_token
      if (localRefresh) {
        refreshAccessToken(localRefresh);
      }
    } else {
      setToken(null); // explicitly set when nothing in localStorage
    }
  }, []);

  if (token === undefined) return <div>Loading...</div>;

  return <div>{token ? <Spotify /> : <Login />}</div>;
}
