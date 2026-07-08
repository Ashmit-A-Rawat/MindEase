import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

const SPOTIFY_API = "http://localhost:5005";

export default function MusicTherapy() {
  const [token, setToken] = useState(localStorage.getItem("spotify_token"));
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const disconnect = () => {
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_refresh_token");
    setToken(null);
    setCurrentTrack(null);
    setPlaylists([]);
  };

  const connect = () => {
    localStorage.setItem("spotify_return_path", window.location.pathname);
    window.location.href = `${SPOTIFY_API}/login`;
  };

  // One-time refresh-and-retry on 401 — Spotify access tokens expire in ~1hr.
  const withAuthRetry = useCallback(
    async (requestFn) => {
      try {
        return await requestFn(token);
      } catch (err) {
        if (err.response?.status !== 401) throw err;
        const refreshToken = localStorage.getItem("spotify_refresh_token");
        if (!refreshToken) {
          disconnect();
          throw err;
        }
        const { data } = await axios.post(`${SPOTIFY_API}/api/refresh`, { refresh_token: refreshToken });
        if (!data.access_token) {
          disconnect();
          throw err;
        }
        localStorage.setItem("spotify_token", data.access_token);
        setToken(data.access_token);
        return requestFn(data.access_token);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [currentRes, userPlaylistsRes, adminPlaylistsRes] = await Promise.allSettled([
          withAuthRetry((t) => axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
            headers: { Authorization: `Bearer ${t}` },
          })),
          withAuthRetry((t) => axios.get("https://api.spotify.com/v1/me/playlists", {
            headers: { Authorization: `Bearer ${t}` },
          })),
          axios.get(`${SPOTIFY_API}/admin-playlists`),
        ]);

        if (currentRes.status === "fulfilled" && currentRes.value.data?.item) {
          const item = currentRes.value.data.item;
          setCurrentTrack({
            name: item.name,
            artists: item.artists.map((a) => a.name).join(", "),
            image: item.album.images?.[2]?.url || item.album.images?.[0]?.url,
            url: item.external_urls?.spotify,
          });
        }

        const userItems = userPlaylistsRes.status === "fulfilled"
          ? userPlaylistsRes.value.data.items.map((p) => ({ id: p.id, name: p.name, source: "Your library" }))
          : [];
        const adminItems = adminPlaylistsRes.status === "fulfilled"
          ? adminPlaylistsRes.value.data.map((p) => ({ id: p.id, name: p.name, source: "Curated for you" }))
          : [];

        setPlaylists([...adminItems, ...userItems]);
      } catch (err) {
        console.error("Music Therapy load error:", err);
        setError("Couldn't load your Spotify data. Try reconnecting.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token, withAuthRetry]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Music Therapy</h1>
          <p className="text-gray-600 mb-6 text-sm">
            Connect your Spotify account to access curated calming playlists and pick up your own music, right from MindEase.
          </p>
          <button
            onClick={connect}
            className="w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.871 7.077-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.722a.78.78 0 01-1.072.257c-2.688-1.652-6.786-2.13-9.965-1.166a.78.78 0 11-.453-1.492c3.632-1.102 8.147-.568 11.233 1.329a.78.78 0 01.257 1.072zm.105-2.834C14.692 9.126 9.375 8.95 6.297 9.891a.936.936 0 11-.543-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.611z" />
            </svg>
            Connect Spotify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600 mb-2">
              Music Therapy
            </h1>
            <p className="text-gray-600">Curated calm, right when you need it</p>
          </div>
          <button onClick={disconnect} className="text-sm text-gray-500 hover:text-gray-700">
            Disconnect
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6">{error}</div>
        )}

        {currentTrack && (
          <a
            href={currentTrack.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-4 mb-8 hover:shadow-md transition-shadow"
          >
            {currentTrack.image && (
              <img src={currentTrack.image} alt="" className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
              <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Now Playing on Spotify</p>
              <p className="font-semibold text-gray-800">{currentTrack.name}</p>
              <p className="text-sm text-gray-500">{currentTrack.artists}</p>
            </div>
          </a>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading your playlists...</div>
        ) : playlists.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
            No playlists found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {playlists.map((p) => (
              <a
                key={p.id}
                href={`https://open.spotify.com/playlist/${p.id}`}
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border border-gray-100"
              >
                <p className="text-xs text-teal-600 font-medium uppercase tracking-wider mb-1">{p.source}</p>
                <p className="font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  Open in Spotify
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
