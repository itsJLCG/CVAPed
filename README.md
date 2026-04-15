# CVAPed — Physical & Speech Therapy Management System

A comprehensive web-based therapy management system for stroke rehabilitation (physical therapy) and pediatric speech therapy. The system integrates wearable hardware sensors, XGBoost-powered speech predictions, and a full therapist workflow covering exercise management, diagnostic comparison, appointment scheduling, and success story publishing.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Features](#features)
7. [Application Workflow](#application-workflow)
8. [API Reference](#api-reference)
9. [Database Collections](#database-collections)
10. [Color Palette](#color-palette)
11. [Security Notes](#security-notes)

---

## Project Structure

```
CVAPed/
├── frontend/                        # React 18 + Vite web application
│   ├── src/
│   │   ├── assets/
│   │   │   └── images.js            # Centralised image registry
│   │   ├── components/
│   │   │   ├── Header.jsx           # Global navigation header
│   │   │   ├── InitialDiagnosticModal.jsx  # First-visit diagnostic prompt
│   │   │   ├── SuccessStoriesSection.jsx   # Landing page stories carousel
│   │   │   ├── TermsAndConditionsModal.jsx
│   │   │   ├── TherapyCategoryContext.jsx  # Global therapy-type state (React Context)
│   │   │   ├── Toast.jsx / ToastContext.jsx # Global notification system
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Public landing page with success stories
│   │   │   ├── Login.jsx / Register.jsx / CompleteProfile.jsx
│   │   │   ├── Dashboard.jsx        # Patient dashboard
│   │   │   ├── TherapySelection.jsx # Physical vs Speech therapy entry
│   │   │   ├── PhysicalTherapy.jsx  # Physical therapy hub (wearable / mobile)
│   │   │   ├── GaitAnalysis.jsx     # Live sensor monitoring (ESP32 stream)
│   │   │   ├── GaitRecording.jsx    # Gait session recording + analysis results
│   │   │   ├── ExercisePlans.jsx    # Gait-aligned exercise prescription
│   │   │   ├── SpeechTherapy.jsx / ArticulationTherapy.jsx / ArticulationExercise.jsx
│   │   │   ├── LanguageTherapy.jsx / FluencyTherapy.jsx
│   │   │   ├── Prediction.jsx       # XGBoost speech mastery predictions
│   │   │   ├── Prescription.jsx     # Therapy prescription viewer
│   │   │   ├── HealthLogs.jsx       # Patient health log history
│   │   │   ├── Appointments.jsx     # Patient appointment booking
│   │   │   ├── AdminDashboard.jsx   # Admin user & role management
│   │   │   ├── TherapistDashboard.jsx  # Full therapist control panel
│   │   │   ├── SuccessStoryPage.jsx # Public story detail page
│   │   │   └── Profile.jsx
│   │   ├── services/
│   │   │   ├── api.js               # Axios client + all service modules
│   │   │   └── firebase.js          # Firebase Auth helpers
│   │   ├── App.jsx                  # Router + auth guard
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
└── backend/                         # Python Flask REST API
    ├── app.py                       # Main application (4 900+ lines)
    ├── requirements.txt
    ├── fluency_crud.py              # Fluency exercise Blueprint
    ├── language_crud.py             # Language exercise Blueprint
    ├── receptive_crud.py            # Receptive language Blueprint
    ├── articulation_crud.py         # Articulation exercise Blueprint
    ├── success_story_crud.py        # Success story Blueprint
    ├── admin/AdminManagement.py     # Admin Blueprint
    ├── hardware_gait_processor.py   # ESP32 IMU + FSR data → gait metrics
    ├── gait_problem_detector.py     # PhysioNet-baseline gait deviation detector
    ├── articulation_mastery_predictor.py
    ├── fluency_mastery_predictor.py
    ├── language_mastery_predictor.py
    ├── overall_speech_predictor.py
    ├── therapy_prioritization.py
    ├── datasets/physionet_gait/
    │   └── gait_baselines.json      # 16-subject PhysioNet statistical baselines
    ├── models/                      # Trained XGBoost model files
    ├── uploads/success_stories/     # Cloudinary-backed image uploads
    └── ESP32_Wearable_Code.ino      # Firmware for the foot wearable device
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, React Router DOM 6 |
| **Animations** | Framer Motion 12 |
| **Audio** | WaveSurfer.js 7 (speech therapy playback) |
| **Forms** | React Hook Form 7 |
| **Icons** | React Icons 5, Font Awesome (CDN) |
| **HTTP Client** | Axios 1.6 |
| **Auth (frontend)** | Firebase 12 (Google OAuth + email/password) |
| **Backend** | Python 3, Flask 3, Flask-CORS, Flask-Bcrypt |
| **Database** | MongoDB Atlas (PyMongo 4.6) |
| **Auth (backend)** | PyJWT 2.10, Firebase Admin SDK 7.1 |
| **ML / Predictions** | XGBoost, scikit-learn, NumPy, pandas |
| **Gait Processing** | SciPy (signal processing, FFT, stats) |
| **Speech Processing** | librosa, soundfile, pydub, Azure Cognitive Services Speech |
| **Image Storage** | Cloudinary 1.40 |
| **Hardware** | ESP32 microcontroller, MPU6050 IMU sensors (×6), FSR pressure sensors (×6) |

---

## Prerequisites

- **Node.js** 18 or higher
- **Python** 3.10 or higher
- **MongoDB Atlas** account (or local MongoDB 6+)
- **Firebase** project with Authentication enabled (Google provider + email/password)
- **Cloudinary** account (for success story image uploads)
- **Azure Cognitive Services** Speech key (for speech therapy audio scoring)
- ESP32 wearable device (optional — required only for hardware gait analysis)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/CVAPed.git
cd CVAPed
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env
# Edit .env — see Environment Variables section below

# Start the Flask server
python app.py
```

Backend runs on **http://localhost:5000**

> On first start, the backend loads all four XGBoost speech predictors and the PhysioNet gait baselines. Expect a few seconds of initialisation output.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

Frontend runs on **http://localhost:5173** (Vite default)

### 4. Build for Production

```bash
cd frontend
npm run build        # outputs to frontend/dist/
npm run preview      # local preview of the production build
```

---

## Environment Variables

Create `backend/.env` from `backend/.env.example` and fill in:

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/CVACare` |
| `SECRET_KEY` | JWT signing secret | any long random string |
| `AZURE_SPEECH_KEY` | Azure Cognitive Services Speech API key | `abc123...` |
| `AZURE_SPEECH_REGION` | Azure region | `southeastasia` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `my-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `secret...` |

The Firebase service account key (`cvaped-fa8b2-firebase-adminsdk-fbsvc-92b2666b41.json`) must be present in the `backend/` directory.

---

## Features

### Authentication & Onboarding
- ✅ Email/password registration and login (JWT)
- ✅ Google OAuth via Firebase (with profile completion flow for new OAuth users)
- ✅ Role-based access control: `patient`, `therapist`, `admin`
- ✅ Initial Diagnostic Modal — prompts new patients on first login to confirm whether they have had a facility assessment, setting the `hasInitialDiagnostic` flag used by the diagnostic comparison workflow

### Physical Therapy — Gait Analysis
- ✅ **Live Sensor Monitor** (`/gait-analysis`) — streams real-time data from the ESP32 wearable via `GET /api/wearable/data` (1 Hz polling); visualises FSR pressure on left/right foot sole overlays and MPU6050 accelerometer/gyroscope readings for all six sensor positions (left/right waist, knee, toe)
- ✅ **Gait Recording Session** (`/gait-recording`) — records 30-second+ walking sessions; buffers IMU and FSR data client-side, then submits to `POST /api/hardware/gait/analyze`
- ✅ **Hardware Gait Processor** — extracts eight gait metrics (cadence, stride length, velocity, gait symmetry, stability score, step regularity, vertical oscillation, step count) using SciPy signal processing and FFT
- ✅ **PhysioNet Gait Problem Detector** — compares patient metrics against statistical baselines derived from 16 healthy control subjects; emits structured problem objects with severity (`severe` / `moderate`) for six deviation types: `slow_cadence`, `asymmetric_gait`, `short_stride`, `slow_velocity`, `poor_stability`, `irregular_steps`
- ✅ Analysis results persisted to `localStorage('gaitAnalysisResult')` and to MongoDB (`gait_progress` collection) for history retrieval
- ✅ Step detection with bilateral foot-activity indicators (left/right foot flash animation during recording)

### Physical Therapy — Exercise Plans
- ✅ **Gait-aligned exercise library** — 23 exercises across four categories (Balance & Symmetry, Speed & Rhythm, Gait Pattern, Strength & Endurance); all exercises target exclusively lower-body (waist-down) muscles and are clinically linked to stroke gait rehabilitation
- ✅ **Automatic recommendation engine** — reads `gaitAnalysisResult` from localStorage; matches each detected problem key against `exercise.relatedProblems[]`; highlights recommended exercises with a gold badge
- ✅ **Detected Issues strip** — renders colour-coded severity pills (red = severe, orange = moderate) for each problem found in the latest gait analysis, bridging the analysis results page to the exercise list
- ✅ **Gait Phase badge** — each exercise card shows which phase of the gait cycle it targets (e.g., Push-Off, Swing Phase, Mid-Stance)
- ✅ **"Addresses" tag** — recommended cards display which specific detected deviations the exercise corrects
- ✅ `PROBLEM_LABELS` and `EXERCISE_METADATA` constants are keyed to backend problem strings, making future API replacement a single-field swap
- ✅ Category filter tabs, difficulty pills, and keyword search; expandable step-by-step instructions per exercise

### Speech Therapy
- ✅ **Articulation Therapy** — sound-by-sound practice (R, S, L, TH, K) with audio recording, Azure Speech scoring, and per-trial progress tracking
- ✅ **Language Therapy** — Receptive (multiple-choice vocabulary/comprehension) and Expressive (picture description, keyword matching) modes
- ✅ **Fluency Therapy** — levelled breathing and rhythm exercises with WaveSurfer.js audio playback
- ✅ **XGBoost Predictions** (`/prediction`) — four independent predictors estimate weeks-to-mastery for articulation, fluency, receptive language, and expressive language; an overall speech improvement predictor aggregates all four

### Therapist Dashboard
- ✅ **Overview tab** — configurable date-range statistics (7 / 30 / 90 days): total sessions, active patients, therapy type breakdown
- ✅ **Exercise Management** — full CRUD for fluency, language (receptive + expressive), and articulation exercises; exercises are grouped by level and ordered within each level; inline modal editor with live preview
- ✅ **Physical Therapy tab** — paginated table of all patient gait analysis sessions with expandable row detail (detected problems, severity, metric values, recommendations)
- ✅ **Diagnostic Comparison** — therapist enters facility assessment scores (articulation per sound, fluency, receptive, expressive, gait stability/symmetry/regularity); system computes a side-by-side comparison against the patient's home self-assessment data; trend chart shows score progression across multiple assessments; creating an `initial` assessment automatically sets the patient's `hasInitialDiagnostic` flag
- ✅ **Appointments** — therapist views all scheduled appointments, picks up unassigned pending requests, assigns themselves, and confirms; filterable by date, status, and therapy type
- ✅ **Success Stories** — therapist creates, edits, and deletes patient success stories with multi-image upload (Cloudinary); stories appear on the public landing page
- ✅ **Reports tab** — aggregated therapy outcome reports

### Patient Portal
- ✅ Appointment booking with optional therapist selection; unassigned bookings enter a pending queue for therapist pickup
- ✅ Appointment cancellation with reason
- ✅ Health logs history
- ✅ Diagnostic comparison read-only view (`/diagnostic-comparison`)
- ✅ Profile management

### Admin Dashboard
- ✅ User listing with pagination and search
- ✅ Role assignment (patient / therapist / admin)
- ✅ User deletion
- ✅ Platform statistics overview

### Landing Page
- ✅ Dynamic success stories carousel (fetched from backend)
- ✅ Individual story detail pages at `/success-story/:storyId` with image lightbox and scroll-triggered animations (Framer Motion)

---

## Application Workflow

### Gait Analysis → Exercise Plans

```
Patient logs in
  └─ TherapySelection → Physical Therapy (/physical-therapy)
       └─ "Start with Hardware" → GaitAnalysis (/gait-analysis)
            Live monitor: ESP32 → POST /api/wearable/data → GET /api/wearable/data (1 Hz)
            └─ "Start Recording" → GaitRecording (/gait-recording)
                 30s+ session: buffers IMU (6 sensors) + FSR (6 sensors)
                 └─ "Stop & Analyze" → POST /api/hardware/gait/analyze
                      hardware_gait_processor.py → 8 gait metrics
                      gait_problem_detector.py → problem list (severity + recommendations)
                      Result saved to MongoDB + localStorage('gaitAnalysisResult')
                 └─ "Exercise Plans" → ExercisePlans (/exercise-plans)
                      Reads localStorage → matches problems → highlights exercises
                      Detected Issues strip + Gait Phase badges + Addresses tags
```

### Speech Therapy → Prediction

```
Patient logs in
  └─ TherapySelection → Speech Therapy (/speech-therapy)
       ├─ Articulation → /articulation/:soundId  (record → Azure score → save trial)
       ├─ Language     → /language-therapy       (receptive / expressive exercises)
       └─ Fluency      → /fluency-therapy        (levelled breathing exercises)
  └─ Prediction (/prediction)
       predictionService.getAllPredictions() → 4 XGBoost models → weeks-to-mastery
```

### Therapist Diagnostic Comparison

```
Therapist Dashboard → Diagnostic Comparison tab
  Search patient by name/email
  Create facility diagnostic (scores + gait metrics + notes)
    → POST /api/therapist/diagnostics
    → If assessment_type = 'initial': sets patient.hasInitialDiagnostic = true
  View comparison: facility scores vs patient home self-assessment
    → GET /api/therapist/diagnostics/:userId/comparison
  View trend chart across all assessments
    → GET /api/therapist/diagnostics/:userId/comparison-history
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Register new patient |
| POST | `/api/login` | Email/password login |
| POST | `/api/auth/firebase` | Firebase OAuth login |
| POST | `/api/auth/complete-profile` | Complete OAuth profile |
| GET | `/api/user` | Get current user |
| PUT | `/api/user/update` | Update profile |
| PUT | `/api/user/diagnostic-status` | Set hasInitialDiagnostic flag |

### Gait Analysis (Hardware)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/wearable/data` | ESP32 sensor data stream |
| POST | `/api/hardware/gait/analyze` | Analyse buffered session data |
| GET | `/api/hardware/gait/history` | Patient gait history |

### Speech Therapy
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/articulation/progress` | Save articulation trial |
| GET | `/api/articulation/progress/:soundId` | Get progress for a sound |
| POST | `/api/language/progress` | Save language trial |
| POST | `/api/fluency/progress` | Save fluency trial |
| GET | `/api/predictions/all` | XGBoost mastery predictions |

### Therapist
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/therapist/stats` | Overview statistics |
| POST | `/api/therapist/diagnostics` | Create facility diagnostic |
| GET | `/api/therapist/diagnostics/:userId` | List patient diagnostics |
| PUT | `/api/therapist/diagnostics/:id` | Update diagnostic |
| DELETE | `/api/therapist/diagnostics/:id` | Delete diagnostic |
| GET | `/api/therapist/diagnostics/:userId/comparison` | Facility vs home comparison |
| GET | `/api/therapist/diagnostics/:userId/comparison-history` | Trend data |
| GET | `/api/diagnostic-comparison` | Patient's own comparison (read-only) |

### Appointments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patient/appointments` | Patient's appointments |
| POST | `/api/patient/appointments/book` | Book appointment |
| PUT | `/api/patient/appointments/:id/cancel` | Cancel appointment |
| PUT | `/api/therapist/appointments/:id/assign` | Therapist self-assign |

### Success Stories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/success-stories` | List all stories (public) |
| GET | `/api/success-stories/:id` | Single story |
| POST | `/api/success-stories` | Create story (therapist) |
| PUT | `/api/success-stories/:id` | Update story (therapist) |
| DELETE | `/api/success-stories/:id` | Delete story (therapist) |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/users` | Paginated user list |
| PUT | `/api/admin/users/:id/role` | Update user role |
| DELETE | `/api/admin/users/:id` | Delete user |

---

## Database Collections

| Collection | Description |
|---|---|
| `users` | All users (patients, therapists, admins) |
| `articulation_progress` | Per-sound articulation session records |
| `articulation_trials` | Individual trial attempts |
| `articulation_exercises` | Therapist-managed exercise definitions |
| `language_progress` | Receptive and expressive language sessions |
| `language_trials` | Individual language trial attempts |
| `fluency_progress` | Fluency session records |
| `gait_progress` | Hardware gait analysis results |
| `appointments` | Appointment records (patient + therapist) |
| `facility_diagnostics` | Therapist-entered facility assessment scores |
| `success_stories` | Patient success story content + image URLs |

---

## Color Palette

| Role | Hex | Usage |
|---|---|---|
| Primary | `#ce3630` | Buttons, accents, active states |
| Secondary | `#479ac3` | Info elements, gait phase badges |
| Accent | `#e8b04e` | Recommended badges, warnings |
| Base | `#ffffff` | Backgrounds |

---

## Security Notes

- All sensitive configuration is stored in `.env` — never commit it to version control
- The Firebase service account JSON file must also be kept out of version control
- Change `SECRET_KEY` to a cryptographically random value in production
- JWT tokens are validated on every protected endpoint via the `@token_required` decorator
- Firebase ID tokens are verified server-side using the Firebase Admin SDK
- The `@therapist_required` decorator enforces role checks on all therapist-only endpoints
- Cloudinary credentials are server-side only; image uploads are proxied through the Flask backend








I’ve confirmed from the project documentation that this is a stroke and pediatric therapy platform with rehabilitation workflows, diagnostics, and access to care features. Next I’ll map it to the closest SDG and note secondary SDGs it also supports.This project primarily falls under SDG 3: Good Health and Well-Being.

Why:

Its core purpose is rehabilitation and therapy delivery for stroke and speech patients, which is directly health-focused.
It includes diagnostic support, therapy planning, monitoring, and follow-up workflows that improve treatment continuity and outcomes.
The platform is explicitly described as a therapy management and rehabilitation system in README.md.