# MindEase — Technical Documentation

**A Digital Mental Health and Psychological Support Platform for Students in Higher Education**

Document Type: Technical Reference & System Documentation
Source: Direct analysis of the MindEase codebase (this repository)
Smart India Hackathon 2025 | Team Codix | Problem ID: 25092
July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction](#2-introduction)
3. [Problem Statement](#3-problem-statement)
4. [Project Objectives](#4-project-objectives)
5. [Project Overview](#5-project-overview)
6. [Core Features](#6-core-features)
7. [Functional Modules](#7-functional-modules)
8. [User Workflow](#8-user-workflow)
9. [Technology Stack](#9-technology-stack)
10. [System Architecture](#10-system-architecture)
11. [Project Structure](#11-project-structure)
12. [Installation & Setup](#12-installation--setup)
13. [Ports & Run Commands — Full Reference](#13-ports--run-commands--full-reference)
14. [Configuration](#14-configuration)
15. [Usage Guide](#15-usage-guide)
16. [API Overview](#16-api-overview)
17. [Database Overview](#17-database-overview)
18. [External Integrations](#18-external-integrations)
19. [Security Features](#19-security-features)
20. [Performance Considerations](#20-performance-considerations)
21. [Known Limitations](#21-known-limitations)
22. [Future Enhancements](#22-future-enhancements)
23. [Conclusion](#23-conclusion)

---

## 1. Executive Summary

MindEase is a digital mental health and psychological support platform built for students in higher
education, connecting two roles — **student** and **counsellor** — around confidential screening,
AI-assisted risk assessment, live counselling, and self-help resources. Over 60% of students in India report
experiencing stress, anxiety, or depression during their academic journey; MindEase's goal is confidential,
stigma-free, and personalized mental well-being support that combines real machine learning (trained on a
public dataset) with real-time human connection (chat and video calling with counsellors).

The platform is implemented as six independent, concurrently-run processes: a React frontend, a Node/
Express API with an embedded Socket.IO server, and four Python/Node microservices, each owning one
capability (ML risk assessment, OCR student verification, AI Support chat, and Spotify integration). This
document, produced by direct analysis of the codebase, describes every implemented feature, the full API
surface, the database schema, and — matching the same standard of honesty as this project's companion
`docs/ARCHITECTURE.md` — a catalogued list of confirmed limitations and gaps, so that a reviewer or future
maintainer does not have to rediscover them.

## 2. Introduction

MindEase addresses a specific, well-documented gap in student mental health support: screening tools exist,
counselling exists, and AI chat tools exist, but they are rarely integrated into one platform that a student
actually wants to use, with risk assessment feeding directly into what a counsellor sees when they open a
student's profile. The system is built on the MERN stack (MongoDB, Express, React, Node.js), supplemented
by four independent FastAPI/Express microservices for the workloads that don't belong in a general-purpose
Node process: OCR, machine learning inference, and retrieval-augmented generation.

## 3. Problem Statement

*Development of a Digital Mental Health and Psychological Support System for Students in Higher Education*
(SIH 2025, Problem ID 25092). Over 60% of students in India experience stress, anxiety, or depression during
their academic journey, and existing support is fragmented across informal peer networks, under-resourced
campus counselling centers, and generic (non-student-specific) wellness apps — none of which combine
confidential screening, data-driven risk triage, and direct access to a real counsellor in one place.

## 4. Project Objectives

- Provide validated psychological screening (PHQ-9, GAD-7, GHQ-12) with progress tracking across repeated
  attempts.
- Provide a genuine machine-learning risk-assessment layer — not a black box, but five distinct techniques
  (Random Forest + Logistic Regression classification, Decision Tree wellness-score regression, K-Means
  population clustering, Apriori association mining) trained on a real public dataset and exposed to
  counsellors through a population-level analytics dashboard.
- Preserve student anonymity where possible while still allowing OCR-verified, authenticated identity for
  counselling-relationship continuity.
- Offer confidential, secure, real-time communication (chat, video) between students and counsellors, with
  no third-party video service in the data path.
- Offer a curated, retrieval-grounded AI chatbot for immediate, always-available psychological first aid, with
  a hard deterministic safety gate for crisis language.
- Support regionalized (multilingual) access for Indian students.

## 5. Project Overview

### 5.1 Purpose

MindEase is a confidential, AI-assisted mental health and counselling platform for students in higher
education, combining screening, risk assessment, live counselling, and self-help tooling in one product.

### 5.2 Target Users

Confirmed directly from the `role` enum on the `User` model (`student` | `counsellor`) and the two parallel
route hierarchies in the frontend (`/student/*`, `/counsellor/*`).

| Role | Primary Activities (as implemented) |
|---|---|
| student | Completes OCR identity verification, fills a wellness intake profile, takes PHQ-9/GAD-7/GHQ-12 screenings, views trend reports, browses/books counsellor slots, joins video calls, uses peer support chat, uses the AI Support chatbot, uses Music Therapy. |
| counsellor | Publishes availability slots, manages appointments (including a per-call emotion-log summary), views a student's assessment history, reviews population-level risk analytics (clusters, association rules, feature importance) across all students. |

### 5.3 Core Value Proposition

A single platform where a student's screening history, ML-derived risk signal, and wellness intake data are
directly visible to the counsellor they're matched with, and where the entire support relationship —
booking, negotiation via chat, and the session itself (video + live affect tracking) — happens inside one
product rather than being split across a screening tool, an email thread, and a video-conferencing app.

## 6. Core Features

### 6.1 Confidential Booking & Screening

Students take PHQ-9 (depression), GAD-7 (anxiety), and GHQ-12 (general psychological well-being)
assessments; questions are seeded reference data (`TestQuestion` collection), answers and computed
severity/score are appended to a per-student `TestResult` document (`tests[]` array — every attempt is kept,
not just the latest), enabling trend tracking across repeated attempts. A PHQ-9 answer indicating suicidal
ideation (question 9) triggers a deterministic safety override in `ml-service`, independent of whatever the
model would otherwise predict.

### 6.2 Wellness Intake & AI Risk Assessment

`WellnessIntake` collects the lifestyle/academic fields (gender, city, CGPA, academic/work pressure, study
satisfaction, sleep duration, dietary habits, degree, work/study hours, financial stress, family history) that
the underlying ML models were actually trained on. This model exists specifically because the platform's core
signup/verification flow (identity, not lifestyle data) doesn't capture any of these fields — a real
integration gap that was found and closed during this project's development by adding this dedicated
intake form, matching the field set of the training dataset column-for-column.

`ml-service` serves:
- A **Random Forest + Logistic Regression** classifier producing a binary risk prediction + probability.
- A **Decision Tree Regressor** producing a continuous 0–100 wellness score.
- Per-student **trend detection** (Linear Regression) across repeated screening attempts.
- **K-Means clustering** segmenting the population into risk profiles (shown to counsellors, not individual
  students).
- **Apriori association-rule mining** surfacing which combinations of risk factors most strongly predict
  elevated risk.

All five techniques are trained on a public Kaggle student-depression dataset (`student_depression.csv`,
27,901 rows) — the population-level views (clusters, association rules) reflect patterns from that training
data, not a re-clustering of MindEase's own (much smaller) live user base; the feature-importance view and
individual risk/wellness-score predictions, by contrast, run live against a given student's actual submitted
data.

### 6.3 OCR Student Verification

`StudentVerification` (OpenCV + EasyOCR + RapidFuzz) extracts text from an uploaded ID card photo and
fuzzy-matches it against the name/college/DOB the student typed into the verification form, returning a
per-field match confidence and an overall pass/fail status. A student's `isVerified` flag only flips to `true`
once the Node backend's `/api1/users/update` route receives a verification result whose `status` is
`"verified"` or `"success"`. This step is compute-heavy (OCR + face-region processing) and can take up to a
minute on a cold service start; the frontend surfaces this expectation explicitly rather than looking frozen.

### 6.4 Moderated Peer Support (Chat)

Real-time one-to-one and group chat between students, counsellors, and peers, built on Socket.IO for live
delivery and REST (`/api1/chat`, `/api1/message`) for history/persistence — both paths write to the same
`Message` collection, so there is no divergence between what a live socket session sees and what a page
reload fetches.

### 6.5 Live Video Counselling

Peer-to-peer WebRTC video calls (`simple-peer`) for Online-mode appointments, signaled entirely through
the existing Socket.IO server — no third-party video service, and no video frame ever transits the backend
(only the SDP/ICE handshake does). STUN (Google) plus a free public TURN fallback (Open Relay Project) are
configured out of the box; a dedicated TURN server can be set via `VITE_TURN_URL`/`VITE_TURN_USERNAME`/
`VITE_TURN_CREDENTIAL` for production-grade reliability behind strict/symmetric NATs.

### 6.6 Real-Time Emotion Detection & Call Summary

Each participant's camera is analyzed **locally in the browser** (`face-api.js`/TensorFlow.js, 7-class facial
expression classification) during a call; the detected label is relayed to the other participant live (an
on-screen overlay) and simultaneously logged, with a timestamp and the detecting participant's role, onto
the `Appointment.emotionLog` array. After the call, the counsellor's Appointments view exposes a collapsible
**Call Summary** listing every logged entry, with concerning emotions (sad/angry/fear/disgust) visually
flagged — letting a counsellor review where in the session a student showed distress, without having to
recall it from memory alone. No camera frame is ever transmitted anywhere for this feature; detection is
100% client-side.

### 6.7 Music Therapy

Spotify Web API integration (via the standalone `Spotify/` proxy) for curated and personal playlists,
accessible without leaving the app — "now playing" status, an admin-curated playlist set, and the student's
own library once they connect their account.

### 6.8 AI Support Chat (RAG)

A custom retrieval-augmented chatbot (`chat-service`) over a curated markdown resource library (anxiety,
mindfulness, self-compassion, sleep hygiene, quick-relief techniques, academic stress, screening-tool
explainers, crisis resources) — FAISS vector search retrieves the most relevant chunks for a message, Gemini
generates a grounded response citing which resource informed it. A deterministic keyword safety gate
(Section 19.5) runs before any retrieval or generation and bypasses both entirely on crisis language.

### 6.9 Multilingual Support

`react-i18next` with English/Hindi/Marathi/Tamil locale files. Coverage is real but partial — see Section 21.

## 7. Functional Modules

The backend is organized into resource-scoped controllers, each owning one collection's business logic.

| Controller | Resource | Notable Logic |
|---|---|---|
| `auth.controller.js` | Signup / login / logout | bcrypt hashing; JWT issuance (7-day expiry) in an httpOnly cookie. |
| `passport.js` (strategy, not a controller) | Google OAuth | Always provisions `role: "student"`; updates `fullName`/`email`/`profilePic` on repeat login. |
| `slotController.js` | Counsellor availability | `counsellorName` falls back to `username` when `fullName` is unset (local-signup counsellors have no `fullName` — a real bug found and fixed during development, see Section 21). |
| `appointmentController.js` | Booking lifecycle | Books a slot + creates an appointment as two sequential writes; sends (isolated, non-blocking) confirmation emails; same `fullName`-fallback fix applied on the student side. |
| `testController.js` | Screening tests | Appends to a per-student `tests[]` array rather than one document per attempt; calls `ml-service` best-effort to attach `mlAnalysis` to a saved result. |
| `wellnessController` (`wellnessRoutes.js`) | Wellness intake | Single upsert per student (`studentId` is `unique: true`). |
| `analysisRoutes.js` | Population analytics | Live MongoDB aggregation of `TestResult` severity distribution — the one part of the counsellor Analysis dashboard that reflects MindEase's own current users, not the training dataset. |
| `mlRoutes.js` (proxy layer) | ML predictions | Thin pass-through to `ml-service`'s REST API. |
| `chatController.js` | 1:1 / group chat | Mirrors the WhatsApp-clone MERN pattern (access/fetch/create-group/rename/add/remove), fully `protectRoute`-gated. |
| `messageController.js` | Chat messages | Fully `protectRoute`-gated. |
| `userRoutes.js` handlers | User CRUD / profile update | `/update` handles the OCR-verification result and Cloudinary file uploads together in one request. |

## 8. User Workflow

### 8.1 Student Onboarding & Screening

1. Sign up (local email/password, or Google OAuth — OAuth always yields role `student`).
2. Complete OCR identity verification (`/student/verify`) — mandatory before the dashboard is reachable
   in the UI (enforced by frontend redirect logic, not a server-side gate).
3. Optionally complete the Wellness Intake form (improves risk-prediction accuracy from a generic default
   to real personalized signal).
4. Take PHQ-9/GAD-7/GHQ-12 screenings; view trend and severity in My Reports.

### 8.2 Booking & Attending a Session

1. Browse a counsellor's published availability slots.
2. Book a slot → an `Appointment` is created with the slot's mode (Online/Offline), meeting link or
   location, and counsellor identity copied over.
3. For Online appointments, either party clicks **Start Video Call** from their Appointments view once the
   session time arrives.
4. During the call, local emotion detection runs continuously; the counsellor can review a **Call Summary**
   afterward.

### 8.3 Counsellor Review Workflow

1. Publish availability slots (Online, with a meeting link, or Offline, with a location).
2. Review incoming bookings in Appointments; mark completed/cancelled as sessions occur.
3. Open a specific student's Assessment History for full PHQ-9/GAD-7/GHQ-12 context before a session.
4. Review population-level Analysis (risk clusters, association rules, feature importance) to understand
   which risk-factor combinations matter most across the student body.

### 8.4 AI Support Chat Workflow

1. A student opens AI Support and sends a message.
2. The message is checked against a fixed crisis-keyword list. If it matches, the LLM is never called — a
   fixed crisis-resources response (helplines) is returned immediately.
3. Otherwise, the message is embedded, the top-matching resource chunks are retrieved via FAISS, and
   Gemini generates a grounded response citing which resource(s) informed it.

## 9. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), Tailwind CSS, `react-i18next`, Recharts, `simple-peer`, `@vladmandic/face-api` (TensorFlow.js) |
| Main Backend | Node.js / Express, MongoDB (Mongoose), Socket.io, Passport (Google OAuth) |
| ML Service | Python / FastAPI, scikit-learn, pandas, `mlxtend` (Apriori) |
| OCR Service | Python / FastAPI, OpenCV, EasyOCR, RapidFuzz |
| AI Support Chat | Python / FastAPI, Gemini (generation + embeddings via direct REST), FAISS |
| Music Integration | Spotify Web API (Node/Express proxy) |
| Emotion Detection | `face-api.js` (TensorFlow.js) — client-side, no backend service |
| File Storage | Cloudinary (profile pictures, ID card photos) |
| Email | Nodemailer (Gmail SMTP) |

## 10. System Architecture

Covered in full in **`docs/ARCHITECTURE.md`** — system topology, request/data flow diagrams, database
architecture, and a section-by-section breakdown of API authorization coverage. This document focuses on
features, setup, and usage; that one focuses on structure and design decisions.

## 11. Project Structure

```
MindEase/
├── backend/
│   ├── config/db.js              (Mongoose connection)
│   ├── controllers/              (business logic, one file per resource)
│   ├── middelware/                (auth.middleware.js, rateLimit.js, multer.js)
│   ├── models/                   (8 Mongoose schemas)
│   ├── routes/                   (Express routers, one file per resource)
│   ├── utils/                    (passport.js, helper.js, sendEmail.js)
│   ├── seeder.js                 (seeds TestQuestion reference data)
│   ├── seedDemo.js               (wipes + reseeds realistic demo data)
│   └── server.js                 (app entry point + Socket.IO)
├── frontend/
│   ├── public/models/            (face-api.js model weights)
│   └── src/
│       ├── pages/{student,counsellor}/   (role-scoped UI)
│       ├── components/chat/              (peer support subsystem)
│       ├── contexts/AuthContext.jsx
│       └── lib/{api.js,i18n.js}
├── ml-service/                   (FastAPI, port 5002)
├── StudentVerification/          (FastAPI, port 8000)
├── Spotify/                      (Express, port 5005)
├── chat-service/                 (FastAPI, port 5007, + documents/*.md resource library)
├── docs/                         (this document + ARCHITECTURE.md)
├── .env.example                  (canonical port map + env var reference)
└── package.json                  (root dev orchestration — see Section 13)
```

## 12. Installation & Setup

```bash
# One-time setup
npm install                 # root dev-orchestration deps (concurrently)
npm run setup:python        # creates ml-service/, StudentVerification/, and chat-service/ .venv's
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd Spotify && npm install && cd ..

# chat-service also needs a Gemini API key (free at https://aistudio.google.com/apikey)
# in chat-service/.env as GEMINI_API_KEY=..., then build its retrieval index once:
npm run build:chat-index

# Start everything together
npm run dev
```

`StudentVerification` requires Python ≥3.11 (`setup:python` invokes `python3.11` explicitly). `ml-service`
works with the default `python3`.

## 13. Ports & Run Commands — Full Reference

### 13.1 Port Map

| Service | Port | Framework | Started By |
|---|---|---|---|
| Frontend | **5173** | Vite (React) | `npm run dev:frontend` |
| Backend (main API + Socket.IO) | **5001** | Node/Express | `npm run dev:backend` |
| ML service | **5002** | FastAPI | `npm run dev:ml` |
| Student Verification (OCR) | **8000** | FastAPI | `npm run dev:ocr` (alias: `dev:verify`) |
| Spotify proxy | **5005** | Node/Express | `npm run dev:spotify` |
| AI Support chat | **5007** | FastAPI | `npm run dev:chat` |

> Note: port 5000 is deliberately avoided for any service — on macOS, the AirPlay Receiver (Control Center)
> squats on port 5000 by default and silently swallows anything else bound there.

### 13.2 Every Run Command

| Command | What It Does |
|---|---|
| `npm run dev` | Starts **all six services** together via `concurrently`, color-coded output per service. |
| `npm run dev:core` | Starts the **five lighter services** (backend, frontend, ml-service, Spotify, chat-service) — skips `StudentVerification`, useful when you're not testing the OCR flow specifically. |
| `npm run dev:backend` | Backend only. |
| `npm run dev:frontend` | Frontend only. |
| `npm run dev:ml` | ML service only. |
| `npm run dev:ocr` / `npm run dev:verify` | Student Verification (OCR) only — two names, same command. |
| `npm run dev:spotify` | Spotify proxy only. |
| `npm run dev:chat` | AI Support chat service only. |
| `npm run setup:python` | Creates the `.venv` for every Python service and installs its `requirements.txt`. |
| `npm run build:chat-index` | (Re)builds `chat-service`'s FAISS index from `chat-service/documents/*.md` — required once before first use, and again whenever those documents change. |

Recommended pattern for local development on a memory-constrained machine: run only what you're
actively testing (`dev:backend` + `dev:frontend` covers most of the app), and add `dev:ml`, `dev:ocr`, or
`dev:chat` in separate terminal tabs only when exercising those specific features. `npm run dev` (all six at
once) is best reserved for a final end-to-end pass.

## 14. Configuration

No `.env` file is committed to the repository (excluded via `.gitignore`, root and per-service). The following
is the complete set of environment variables referenced in code, mirroring the canonical `.env.example` at
the repository root.

### 14.1 `backend/.env`

| Variable | Purpose |
|---|---|
| `PORT` | Port the main API listens on (5001). |
| `MONGO_URI` | MongoDB connection string. |
| `SESSION_SECRET` | Signs the `express-session` cookie backing Passport OAuth. |
| `JWT_SECRET` | Signs/verifies the JWT issued on local login and OAuth callback. |
| `CLIENT_URL` | Frontend origin, used for CORS and post-OAuth redirects. |
| `CHAT_FRONTEND` | A second allowed CORS origin. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials. |
| `GOOGLE_CALLBACK_URL` | Must exactly match the Authorized Redirect URI registered in Google Cloud Console. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | File upload storage. |
| `ML_SERVICE_URL` | Where the backend proxies ML requests to. |
| `STUDENT_VERIFICATION_URL` | Reserved; the frontend currently calls `StudentVerification` directly rather than through the backend. |

### 14.2 `ml-service/.env`

`PORT` only — currently reserved/unused by `app.py` at runtime, kept for consistency with the other services.

### 14.3 `StudentVerification`

No `.env` file — runs on a fixed port (8000). Requires Python ≥3.11.

### 14.4 `Spotify/.env`

| Variable | Purpose |
|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify API credentials. |
| `SPOTIFY_REDIRECT_URI` | Must exactly match the redirect URI registered in the Spotify Developer Dashboard. Points at the **main frontend's root** (`Home.jsx` catches the `?code=`/`?error=` query params), not at the Spotify server itself, because Spotify only allows a fixed, pre-registered redirect URI. |
| `ADMIN_USER_ID` | Spotify user ID whose public playlists populate the "Curated for you" section. |
| `PORT` | 5005. |

### 14.5 `frontend/.env`

All optional — every one of these has a `localhost` fallback baked into the code, so local dev works with
none of it set. Only matters once deploying somewhere other than `localhost`.

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Main backend API base (`http://localhost:5001/api1`). |
| `VITE_BACKEND_URL` | Main backend origin, no `/api1` suffix (used for Socket.IO connection). |
| `VITE_STUDENT_VERIFICATION_URL` | OCR service base. |
| `VITE_SPOTIFY_SERVICE_URL` | Spotify proxy base. |
| `VITE_CHAT_SERVICE_URL` | AI Support chat service base. |
| `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` | Optional dedicated TURN server for WebRTC; without it, calls fall back to STUN + a free public TURN (Open Relay Project, best-effort). |

### 14.6 `chat-service/.env`

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Required. Free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| `GEMINI_CHAT_MODEL` | Optional override; the service tries a built-in fallback list of current model names if unset or if the override has been retired. |

## 15. Usage Guide

### 15.1 For Students

- Sign up, complete OCR verification, optionally complete the Wellness Intake form.
- Take screening tests periodically and review trends in My Reports.
- Browse counsellor availability and book a session.
- Join video calls for Online sessions; use Peer Support chat and the AI Support chatbot as needed.
- Use Music Therapy for curated calming playlists.

### 15.2 For Counsellors

- Publish availability slots (Online with a meeting link, or Offline with a location).
- Manage incoming appointments; review a student's full assessment history before a session.
- Review a Call Summary after video sessions to see logged affect data.
- Review population-level risk analytics in the Analysis dashboard.

## 16. API Overview

All paths are mounted under `/api1`. "Auth" indicates whether `protectRoute` is applied. See
`docs/ARCHITECTURE.md` Section 9.2 for the full protected/unprotected breakdown by design intent.

### Auth (`/api1`)

`POST /signup`, `POST /login` (both rate-limited, 20/15min/IP), `POST /logout`, `GET /auth/google`,
`GET /auth/google/callback`, `GET /logout` (session-based variant), `GET /me` (protected),
`DELETE /me` (protected — GDPR erasure).

### Users (`/api1/users`)

`GET /students` (no auth), `POST /update` (protected — profile + OCR-verification result + file upload),
`GET /search` (protected), `GET /debug` (protected).

### Slots (`/api1/slots`)

`GET /` (protected), `POST /` (protected), `PUT /:id` (**no auth**), `DELETE /:id` (**no auth**).

### Appointments (`/api1/appointments`)

`POST /` (book — no auth), `GET /student/:studentId` (no auth), `GET /counsellor/:counsellorId` (no auth),
`PUT /:id` (status update — no auth).

### Tests (`/api1/tests`)

`GET /questions/:testType`, `POST /results`, `GET /results/:studentId`,
`GET /results/:studentId/:testId` — none require auth.

### Wellness (`/api1/wellness`)

`GET /:studentId`, `POST /` (upsert) — neither requires auth.

### Analysis (`/api1/analysis`)

`GET /` — live severity-distribution aggregation across all `TestResult` documents; no auth.

### ML (`/api1/ml`)

`GET /risk/:studentId`, `GET /wellness-score/:studentId`, `GET /cluster/:studentId`, `GET /trend/:studentId`,
`GET /clusters`, `GET /associations`, `GET /feature-importance` — thin proxies to `ml-service`; no auth.

### Students / Counsellors (`/api1/students`, `/api1/counsellors`)

`GET /:id` on each — public lookup, no auth.

### Chat (`/api1/chat`)

`POST /` (access/create a 1:1 chat), `GET /` (fetch chats), `POST /group`, `PUT /rename`, `PUT /groupremove`,
`PUT /groupadd` — **every route protected**.

### Message (`/api1/message`)

`GET /:chatId`, `POST /` — **every route protected**.

## 17. Database Overview

MongoDB via Mongoose, eight collections, no transactions or multi-document ACID guarantees anywhere
(Section 21). Full architectural discussion in `docs/ARCHITECTURE.md` Section 7; this section covers per-field
schema detail.

### 17.1 User

| Field | Type | Constraints |
|---|---|---|
| `username` | String | Required, unique, auto-generated. |
| `email` | String | Unique, sparse, lowercase. |
| `role` | String | Required, enum `student`\|`counsellor`. |
| `fullName` | String | Only ever set by Google OAuth — local signups leave this unset (a real, fixed-around gap; see Section 21). |
| `password` | String | Required only if no `googleId`; bcrypt-hashed. |
| `googleId` | String | Required only if no `password`; unique, sparse. |
| `isVerified` | Boolean | Default `false`; flips true once OCR verification passes. |
| `profilePic`, `idCard` | String (URL) | Cloudinary URLs. |
| `collegeName`, `academicYear`, `dob` | — | Identity fields from OCR verification. |
| `isAdmin` | Boolean | Default `false` — defined but not used anywhere in the current codebase; not a functioning role. |

### 17.2 Slot

`counsellorName`, `counsellorEmail` (String, required — copied from the creating counsellor, not a live
reference), `date`, `time`, `mode` (String, required — `"Online"`/`"Offline"`), `meetingLink`, `location`,
`isBooked` (Boolean, default `false`).

### 17.3 Appointment

`studentName`, `studentEmail`, `counsellorName`, `counsellorEmail` (all copied at booking time), `date`,
`time`, `mode`, `meetingLink`, `location`, `status` (enum `Pending`\|`Booked`\|`Confirmed`\|`Completed`\|
`Cancelled`, default `Pending`), `emotionLog[]` (embedded: `timestamp`, `emotion`, `confidence`,
`participantRole` enum `student`\|`counsellor`).

### 17.4 TestQuestion

`testType` (enum `PHQ-9`\|`GAD-7`\|`GHQ-12`), `questions[]` (String array) — static reference data, seeded
once via `backend/seeder.js`, not user-generated.

### 17.5 TestResult

`studentId` (ObjectId ref `User`, required), `tests[]` (embedded array, one entry per attempt): `testType`,
`answers[]` (Number array), `score`, `severity`, `recommendation`, `createdAt`, and an optional `mlAnalysis`
subdocument (`riskPrediction`, `riskProbability`, `riskLevel`, `wellnessScore`, `clusterId`, `clusterLabel`,
`computedAt`) populated best-effort at save time by calling `ml-service` — absent if that service was
unreachable, and never blocks saving the test result itself.

### 17.6 WellnessIntake

`studentId` (ObjectId ref `User`, required, unique — one intake per student), `gender`, `city`, `cgpa`,
`academicPressure`, `workPressure`, `studySatisfaction`, `jobSatisfaction`, `sleepDuration`, `dietaryHabits`,
`degree`, `workStudyHours`, `financialStress`, `familyHistory` — the exact field set the underlying ML models
were trained on (Section 6.2).

### 17.7 Chat

`chatName`, `isGroupChat` (Boolean, default `false`), `users[]` (ObjectId refs `User`), `latestMessage`
(ObjectId ref `Message`), `groupAdmin` (ObjectId ref `User`).

### 17.8 Message

`sender` (ObjectId ref `User`), `content`, `chat` (ObjectId ref `Chat`), `readBy[]` (ObjectId refs `User`).

## 18. External Integrations

| Integration | Purpose | Notes |
|---|---|---|
| Google Gemini API | AI Support chat embeddings + generation | Called via direct `httpx` REST, not the official SDK, after the SDK hung indefinitely in this deployment environment (traced to IPv6 DNS resolution stalling — see `docs/ARCHITECTURE.md` Section 11 for the fix). |
| Google OAuth | Student sign-in | Cannot create counsellor accounts (Section 21). |
| Spotify Web API | Music Therapy | Redirect URI is fixed by Spotify's dashboard config; frontend origin must match exactly, including host (`127.0.0.1` vs `localhost` are different origins to a browser). |
| Cloudinary | Profile picture / ID card storage | Publicly retrievable by URL once uploaded. |
| Gmail SMTP (Nodemailer) | Booking confirmation email | Isolated from the booking transaction; a delivery failure is logged, never fails the booking. |
| `face-api.js` model weights | Client-side emotion detection | Static assets, no network call at inference time. |

## 19. Security Features

### 19.1 Authentication

Stateless JWT (7-day expiry) in an **httpOnly cookie** (not `localStorage`) for local login; session-backed
Passport OAuth for Google sign-in, converging on the same JWT cookie after the OAuth callback. Passwords
hashed with `bcryptjs`.

### 19.2 Authorization

Role-based checks exist only inline in specific controllers — there is no `authorize(role)` middleware. See
`docs/ARCHITECTURE.md` Section 9.2 for the complete, verified per-route breakdown of what is and isn't
`protectRoute`-gated.

### 19.3 Rate Limiting

`express-rate-limit` on `/signup` and `/login` only (20 attempts/15 minutes per IP). No other endpoint is
rate-limited.

### 19.4 File Upload Security

Cloudinary's `allowed_formats` restricts uploads to `jpg`/`png`/`jpeg`. No explicit size cap is configured in
the Multer layer itself.

### 19.5 Deterministic Crisis Safety Gates

Two independent hard gates, both intentionally over-inclusive (Section 9.6 of `docs/ARCHITECTURE.md`): a
PHQ-9 suicidal-ideation check in `ml-service` that overrides the model's own prediction, and a
crisis-keyword check in `chat-service` that bypasses the LLM entirely on a match.

### 19.6 Data Protection

`DELETE /api1/me` implements account + core wellness-data erasure (`User`, `WellnessIntake`, `TestResult`)
— deliberately scoped to not touch shared records (`Appointment`, `Chat`, `Message`) that involve other
people.

### 19.7 Secrets & Environment Configuration

No `.env` file is committed anywhere in the repository. See Section 14 for the full variable reference.

## 20. Performance Considerations

- No caching layer anywhere in the stack; `analysisRoutes.js`'s severity aggregation recomputes from raw
  `TestResult` documents on every request.
- Cold-start latency on the Python services is real and non-trivial: `StudentVerification`'s OCR pipeline
  (EasyOCR + face processing) has been measured taking up to ~75 seconds on a cold service start; the
  frontend now sets an explicit request timeout and expectation-setting copy for this specific step.
- Client-side emotion detection (Section 6.6) removed what was previously the heaviest service to cold-start
  (TensorFlow Lite + OpenCV) from the deployment footprint entirely.
- No horizontal-scaling or load-balancing configuration exists for any service.

## 21. Known Limitations

Confirmed, code-verified items — not speculation — catalogued here so a maintainer does not have to
rediscover them.

- **Inconsistent authorization coverage.** Most resource routes (appointments, ML/analysis, wellness,
  tests, student/counsellor profile lookups) trust client-supplied IDs with no JWT check; `PUT`/`DELETE` on
  `/api1/slots/:id` are unprotected even though `GET`/`POST` on the same router are (`docs/ARCHITECTURE.md`
  Section 9.2).
- **No authentication on the Socket.IO layer** — chat and WebRTC signaling both trust a client-supplied
  identifier with no JWT verification, unlike the REST API.
- **Google OAuth cannot create a counsellor account** — it hardcodes `role: "student"`.
- **`fullName` is only ever populated by Google OAuth.** Local-signup accounts (of either role) have no
  `fullName` until they update their profile; two real bugs stemming from this (slot creation and appointment
  booking crashing with a Mongoose validation error for local-signup counsellors/students) were found and
  fixed during this project's development by falling back to `username`.
- **No MongoDB transactions.** Booking a slot + creating an appointment are two sequential, non-atomic
  writes.
- **Partial internationalization coverage** — real, functional `i18next` scaffolding, but not every page uses
  it (`docs/ARCHITECTURE.md` Section 5.5).
- **No automated test suite.** All verification performed during development was interactive/ad hoc, not a
  committed, repeatable suite.
- **No deployment configuration** (`Dockerfile`, `docker-compose.yml`, or platform-specific manifest)
  anywhere in the repository.
- **Spotify's redirect URI is origin-sensitive.** It must match exactly, including whether the app is reached
  via `localhost` or `127.0.0.1` — these are different origins to a browser even though they resolve to the
  same machine, and this caused a real, since-fixed session-loss bug during development.

## 22. Future Enhancements

Reasonable remediation directions inferred from Section 21, not a stated product roadmap:

- Extend JWT-based `protectRoute` coverage to the currently-unprotected resource routes.
- Add authentication to the Socket.IO layer.
- Allow counsellor account creation via Google OAuth (or make the role explicit in the OAuth flow).
- Introduce MongoDB transactions (or a compensating-action pattern) for the booking write sequence.
- Extend i18n coverage to the remaining untranslated pages.
- Add a committed, repeatable automated test suite.
- Add deployment configuration (containerization, a CI/CD pipeline) for a non-local target environment.

## 23. Conclusion

MindEase, as implemented in this repository, is a functionally complete mental-health support platform
combining validated psychological screening, a genuinely multi-technique machine-learning risk-assessment
layer trained on real data, live counselling (chat and video with client-side affect tracking), and a
retrieval-grounded AI chatbot with a hard safety gate for crisis content — built as six independently-run
services rather than a single monolith. The same source material also documents a specific, honestly-
catalogued set of implementation gaps (Section 21) that a future maintainer would need to close before this
could be considered production-hardened. This document, together with `docs/ARCHITECTURE.md`, presents
both sides — capabilities and limitations — without embellishment.

---

*This document was produced by directly reading the MindEase source code in this repository. Where
information was not available in the code itself, this is stated explicitly rather than inferred or fabricated.*
