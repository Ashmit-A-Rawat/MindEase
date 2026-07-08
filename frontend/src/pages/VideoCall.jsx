import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import io from "socket.io-client";
import Peer from "simple-peer";
import { useAuth } from "../contexts/useAuth.js";
import { BACKEND_URL } from "../lib/api.js";

const ENDPOINT = BACKEND_URL;
const EMOTION_API = import.meta.env.VITE_EMOTION_SERVICE_URL || "http://localhost:5006";
const EMOTION_CAPTURE_INTERVAL_MS = 4000;

// STUN alone (the previous setup) only helps peers discover their public
// IP/port — it does nothing when a NAT won't allow direct inbound traffic
// at all (common on strict/symmetric NATs, some corporate networks). TURN
// relays the actual media through a third-party server as a fallback, at
// the cost of that server needing bandwidth for every such call.
//
// Real, dedicated TURN credentials (self-hosted coturn, or a provider like
// Metered.ca/Twilio/Xirsys) should be set via VITE_TURN_URL/VITE_TURN_USERNAME/
// VITE_TURN_CREDENTIAL — see .env.example. The Open Relay Project entries
// below are a free public fallback; unverified/best-effort (no uptime
// guarantee), but harmless to include even if unreachable — WebRTC's ICE
// gathering just skips candidates that don't respond, it doesn't fail the
// whole connection because one candidate is bad.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(import.meta.env.VITE_TURN_URL
    ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      }]
    : []),
  { urls: "stun:openrelay.metered.ca:80" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

const EMOTION_EMOJI = {
  happy: "😊", sad: "😢", angry: "😠", fear: "😨",
  surprise: "😲", disgust: "🤢", neutral: "😐",
};

export default function VideoCall() {
  const { appointmentId } = useParams();
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const otherPartyName = location.state?.otherPartyName || t("videoCall.otherParticipant");

  const [status, setStatus] = useState("connecting"); // connecting | waiting | connected | ended | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteEmotion, setRemoteEmotion] = useState(null); // { emotion, confidence }

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const emotionIntervalRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    const start = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.error("getUserMedia failed:", err);
        setStatus("error");
        setErrorMessage(t("videoCall.cameraError"));
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setStatus("waiting");

      const socket = io(ENDPOINT);
      socketRef.current = socket;
      socket.emit("join-call", appointmentId);

      // Deterministic initiator: avoids a race over who starts the SDP
      // offer, since both sides mount and join around the same time.
      const initiator = currentUser.role === "student";
      const peer = new Peer({ initiator, trickle: true, stream, config: { iceServers: ICE_SERVERS } });
      peerRef.current = peer;

      peer.on("signal", (signal) => {
        socket.emit("call-signal", { appointmentId, signal });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        setStatus("connected");
      });

      peer.on("close", () => setStatus("ended"));
      peer.on("error", (err) => {
        console.error("Peer error:", err);
        setStatus("error");
        setErrorMessage(t("videoCall.peerError"));
      });

      socket.on("call-signal", ({ signal }) => {
        if (peerRef.current && !peerRef.current.destroyed) peerRef.current.signal(signal);
      });

      socket.on("call-peer-left", () => {
        setStatus("ended");
      });

      // The other participant's detected emotion, relayed through the
      // backend (see server.js's "emotion-update" handler) — this browser
      // never sends its own frames anywhere except emotion-service directly.
      socket.on("emotion-update", ({ emotion, confidence }) => {
        setRemoteEmotion(emotion ? { emotion, confidence } : null);
      });

      // Periodically capture a local frame and analyze it against
      // emotion-service. Best-effort: a down/slow emotion-service should
      // never affect the call itself, so every failure is swallowed.
      emotionIntervalRef.current = setInterval(async () => {
        const video = localVideoRef.current;
        const canvas = captureCanvasRef.current;
        if (!video || !canvas || video.videoWidth === 0) return;
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

          const res = await fetch(`${EMOTION_API}/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: dataUrl }),
          });
          if (!res.ok) return;
          const result = await res.json();
          if (result.face_detected && socketRef.current) {
            socketRef.current.emit("emotion-update", {
              appointmentId,
              emotion: result.emotion,
              confidence: result.confidence,
            });
          }
        } catch (err) {
          console.warn("Emotion detection unavailable:", err.message);
        }
      }, EMOTION_CAPTURE_INTERVAL_MS);
    };

    start();

    return () => {
      cancelled = true;
      if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (peerRef.current && !peerRef.current.destroyed) peerRef.current.destroy();
      if (socketRef.current) {
        socketRef.current.emit("leave-call", appointmentId);
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, currentUser?.role]);

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const endCall = () => {
    navigate(-1);
  };

  const STATUS_LABEL = {
    connecting: t("videoCall.connecting"),
    waiting: t("videoCall.waitingFor", { name: otherPartyName }),
    connected: t("videoCall.connected"),
    ended: t("videoCall.ended"),
    error: errorMessage,
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 relative">
        {/* Remote video fills the screen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-black"
          style={{ minHeight: "70vh" }}
        />
        {/* Hidden canvas used only to grab local frames for emotion detection */}
        <canvas ref={captureCanvasRef} className="hidden" />

        {status === "connected" && remoteEmotion && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <span className="text-xl">{EMOTION_EMOJI[remoteEmotion.emotion] || "🙂"}</span>
            <span className="text-white text-sm font-medium capitalize">{remoteEmotion.emotion}</span>
          </div>
        )}

        {status !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center px-6">
              {status === "error" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
              )}
              <p className="text-white font-medium">{STATUS_LABEL[status]}</p>
            </div>
          </div>
        )}

        {/* Local video, picture-in-picture */}
        <div className="absolute bottom-4 right-4 w-32 md:w-48 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-black">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-xs">
              {t("videoCall.cameraOff")}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 py-4 flex items-center justify-center gap-4">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${micOn ? "bg-gray-600 hover:bg-gray-500" : "bg-red-600 hover:bg-red-700"}`}
          title={micOn ? t("videoCall.mute") : t("videoCall.unmute")}
        >
          {micOn ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2M5 5l14 14" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOn ? "bg-gray-600 hover:bg-gray-500" : "bg-red-600 hover:bg-red-700"}`}
          title={camOn ? t("videoCall.turnOffCamera") : t("videoCall.turnOnCamera")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        <button
          onClick={endCall}
          className="px-6 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: "rotate(135deg)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {t("videoCall.endCall")}
        </button>
      </div>
    </div>
  );
}
