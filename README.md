# 🧠 MindEase  
**Smart India Hackathon 2025 | Team Codix | Problem ID: 25092**  
**Theme:** MedTech / BioTech / HealthTech  **Category:** Software  

---

## 💡 Project Overview  
**MindEase** is a digital mental health and psychological support platform for students in higher education.  
It combines **AI-driven psychological first aid**, **secure counseling sessions**, and **regionalized mental health content** to make mental well-being accessible, stigma-free, and personalized for Indian students.

---

## 🎯 Problem Statement  
> *Development of a Digital Mental Health and Psychological Support System for Students in Higher Education.*

Over 60% of students in India experience stress, anxiety, or depression during their academic journey.  
MindEase addresses this gap by providing **confidential**, **culturally relevant**, and **AI-assisted mental health support**, ensuring timely intervention and promoting overall well-being.

---

## 🌟 Key Features / USP  

| Category | Description |
|-----------|-------------|
| 🩺 **AI Risk Assessment** | Random Forest + Logistic Regression risk classifier, a Decision Tree Regressor for a continuous 0-100 wellness score, and per-student trend detection (Linear Regression) across repeated PHQ-9/GAD-7/GHQ-12 attempts. |
| 🧭 **Population-Level BI Dashboard** | K-Means clustering segments students into risk profiles; Apriori-mined association rules surface which risk-factor combinations most strongly predict elevated risk — both surfaced on the counsellor dashboard. |
| 🔒 **Confidential Booking** | Anonymous and secure scheduling for on-campus counselors and helplines. |
| 🎫 **OCR Student Verification** | ID-card verification via OpenCV + EasyOCR + fuzzy matching, preserving anonymity elsewhere in the app. |
| 💬 **Moderated Peer Support** | Real-time one-to-one and group chat (Socket.io) between students, counsellors, and peers. |
| 🧠 **Integrated Screening Tools** | PHQ-9, GAD-7, and GHQ-12 tests with progress tracking dashboards. |
| 🎵 **Music Therapy** | Spotify integration — curated and personal playlists, accessible without leaving the app. |
| 🗣️ **Multilingual Support** | i18n scaffolding for English, Hindi, Marathi, and Tamil. |
| 🤖 **AI Support Chat** | Embedded conversational assistant for emotional support and coping strategies (currently a third-party widget — see Roadmap for a custom, safety-gated LLM). |
| 🎥 **Live Video Counseling** | Peer-to-peer WebRTC video calls between student and counsellor for Online-mode appointments, no third-party video service involved. |
| 😊 **Real-Time Emotion Detection** | OpenCV + CNN facial emotion classification (7 categories) during live calls — each participant's camera is analyzed locally and the result relayed to the other side, so the counsellor can see the student's emotional state (and vice versa) without either party's video ever leaving their own browser except as periodic frames to the detection service. |

---

## 🧠 Technical Approach  

- **Machine Learning Models:** Logistic Regression, Random Forest, Decision Tree Regression, K-Means clustering, and Apriori association rule mining — trained on a public student depression dataset, served via a dedicated FastAPI ML microservice (`ml-service/`). See `ml-service/SCHEMA_MAPPING.md` for exactly which inputs drive which model.
- **OCR Verification:** Student ID authentication via OpenCV + EasyOCR + fuzzy string matching (`StudentVerification/`).
- **Emotion Detection:** OpenCV (Haar cascade face detection) + a pretrained CNN (`emotion-service/`, TensorFlow Lite backend via the `fer` package) — 7-class facial emotion classification during live video calls.
- **Live Video:** WebRTC (`simple-peer`) for peer-to-peer counseling calls, signaled through the existing Socket.io server — no video ever transits the backend, only the SDP/ICE handshake.
- **Backend Architecture:** Node/Express REST API (`/api1/*`) for auth, appointments, tests, chat, and ML — proxying to the Python ML microservice rather than reimplementing model inference.
- **Real-time Communication:** Socket.io for chat, WebRTC signaling, and emotion-label relay during calls.
- **Data Security:** Password hashing (bcrypt), JWT + session auth, HttpOnly cookies.

---

## ⚙️ Tech Stack  

| Layer | Technology |
|--------|-------------|
| **Frontend** | React (Vite), Tailwind CSS, react-i18next, Recharts |
| **Main Backend** | Node.js / Express, MongoDB (Mongoose), Socket.io, Passport (Google OAuth) |
| **ML Service** | Python / FastAPI, scikit-learn, pandas, mlxtend (Apriori) |
| **OCR Service** | Python / FastAPI, OpenCV, EasyOCR, RapidFuzz |
| **Emotion Service** | Python / FastAPI, OpenCV, `fer` (CNN via TensorFlow Lite) |
| **Live Video** | WebRTC, `simple-peer`, Socket.io (signaling) |
| **Music Integration** | Spotify Web API (Node/Express proxy) |

---

## 🚧 Roadmap — Not Yet Implemented

Honesty check for anyone evaluating this repo: the items below appear in earlier problem-statement framing but are not built yet. They're genuine future work, not shipped features.

| Item | Status |
|---|---|
| **Custom LLM psychological-first-aid chatbot** | Current "AI Support" is a third-party embedded widget, not a custom model. A safety-gated (crisis-keyword override before any model response) RAG chatbot is planned. |
| **Twilio integration** | Not built — live video uses WebRTC directly instead. |
| **HIPAA/GDPR formal compliance** | Not something this repo can claim on its own — formal compliance is a legal/regulatory process, not a coding task. A technical hardening pass fixed several concrete gaps a review would flag: session/JWT cookies had an inverted `secure` flag (would have sent auth cookies over plain HTTP in a real production deployment), several endpoints returned full user documents including the password hash to the client, auth endpoints had no rate limiting, `/api1/me` (DELETE) now supports account + core wellness-data erasure. Still open and genuinely unaddressed: encryption at rest (a database/infra decision, not app code), a real audit-logging system for who accessed a student's records, a published privacy policy, and data processing agreements with third-party processors (Cloudinary, Spotify). |
| **Dedicated TURN server for WebRTC** | Calls now include STUN + a free public TURN fallback (Open Relay Project) so most strict-NAT cases are covered, but that fallback has no uptime/capacity guarantee. For production, set `VITE_TURN_URL`/`VITE_TURN_USERNAME`/`VITE_TURN_CREDENTIAL` (see `.env.example`) to real credentials — self-hosted coturn or a provider (Metered.ca, Twilio, Xirsys). |

---

## 🏃 Running Locally

This repo is six services: main frontend, main backend, an ML microservice, an OCR microservice, an emotion-detection microservice, and a Spotify proxy. See `.env.example` for the full port map and required environment variables — copy the relevant block into each service's own `.env`.

```bash
# One-time setup
npm install                 # root dev-orchestration deps (concurrently)
npm run setup:python        # creates ml-service/, StudentVerification/, and emotion-service/ .venv's
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd Spotify && npm install && cd ..

# Start everything together
npm run dev
```

`StudentVerification` and `emotion-service` require Python ≥3.11 — `setup:python` invokes `python3.11` explicitly for both. `ml-service` works with the default `python3`.

---

## 🧩 Feasibility & Viability  

### ✅ Feasibility
- **Technical:** Achievable with existing AI, WebRTC, and encryption technologies.  
- **Economic:** Sustainable via institutional licenses, grants, and partnerships.  
- **Operational:** Requires counseling collaborations and 24/7 moderation teams.  
- **Legal:** Follows HIPAA/GDPR standards and Indian mental health data regulations.  
- **Market:** High demand among higher education institutions; scalable to other sectors.

### ⚠️ Challenges & Mitigation  

| Challenge | Mitigation |
|------------|-------------|
| **Stigma & Privacy Concerns** | Promote anonymity and peer ambassador campaigns. |
| **AI Missteps During Crises** | Implement human-in-the-loop monitoring and safety keywords. |
| **Connectivity Barriers** | Provide low-bandwidth mobile-friendly versions. |
| **Language Barriers** | Use validated translations and voice-based inputs. |
| **Counselor Shortage** | Tiered support: AI → peer volunteer → professional counselor. |
| **Regulatory Compliance** | Align with teletherapy laws and ethical AI guidelines. |

---

## 💬 Strategies  

- **Stigma Reduction:** Student ambassadors & anonymous forums.  
- **Clinical Safety:** AI guardrails and real-time moderation.  
- **Academic Integration:** LMS plug-ins for wellness check-ins.  
- **Scalable Support:** Tiered support system combining AI, peers, and professionals.  
- **Awareness Campaigns:** Student-led outreach promoting help-seeking behavior.

---

## 🌈 Impact & Benefits  

| Type | Impact |
|------|--------|
| 🧘 **Psychological** | 24/7 support reduces anxiety, depression, and academic stress. |
| 🎓 **Academic** | Boosts concentration, reduces dropout rates through early support. |
| 🏛️ **Institutional** | Enables data-driven resource allocation and policy decisions. |
| 🌍 **Social** | Builds supportive peer networks and normalizes mental health conversations. |

---

## 🔬 Research & References  

- [Mental Health App Development](https://www.upwork.com/resources/how-to-develop-an-app)  
- [AI/ML for Mental Health Chatbots](https://www.nature.com/articles/s41746-020-0236-4)  
- [WebRTC for Video Counseling](https://webrtc.org/)  
- [PHQ-9 & GAD-7 Screening Tools](https://www.phqscreeners.com/)  
- [HIPAA Compliance in Healthcare Apps](https://www.hipaajournal.com/hipaa-compliance-checklist/)  
- [Internationalization in Apps (i18n)](https://docs.flutter.dev/development/accessibility-and-localization/internationalization)  
- [Crisis Detection Algorithms](https://www.sciencedirect.com/science/article/pii/S2352827320302419)  
- [Twilio Mental Health APIs](https://www.twilio.com/docs/apis)

---


---

🌐 *Smart India Hackathon 2025 Submission*
