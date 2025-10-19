import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import qs from "qs"; // for URL-encoded form data

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret =  process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
const admin_user_id = process.env.ADMIN_USER_ID;

// ==========================
// Existing endpoints for login/token/refresh
// ==========================

// Step 1: Redirect user to Spotify login
app.get("/login", (req, res) => {
  const scope = [
    "user-read-private",
    "user-read-email",
    "user-modify-playback-state",
    "user-read-playback-state",
    "user-read-currently-playing",
    "user-read-recently-played",
    "user-top-read",
  ].join(" ");

  const authURL = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirect_uri)}&show_dialog=true`;

  res.redirect(authURL);
});

// Step 2: Exchange code for access + refresh tokens
app.post("/api/token", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Authorization code is required" });

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirect_uri);

    const response = await axios.post("https://accounts.spotify.com/api/token", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    res.json({ access_token, refresh_token, expires_in });
  } catch (err) {
    console.error("Token exchange error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

// Step 3: Refresh token endpoint
app.post("/api/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: "Refresh token is required" });

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refresh_token);

    const response = await axios.post("https://accounts.spotify.com/api/token", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("Refresh token error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// ==========================
// New endpoint: Admin Playlists
// ==========================
app.get("/admin-playlists", async (req, res) => {
  try {
    // 1️⃣ Get access token via Client Credentials Flow
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      qs.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2️⃣ Fetch admin public playlists
    const playlistsResponse = await axios.get(
      `https://api.spotify.com/v1/users/${admin_user_id}/playlists`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // 3️⃣ Map only needed data
    const playlists = playlistsResponse.data.items.map(({ name, id }) => ({ name, id }));
    res.json(playlists);
  } catch (error) {
    console.error("Error fetching admin playlists:", error);
    res.status(500).json({ error: "Failed to fetch admin playlists" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
