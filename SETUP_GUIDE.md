# CVAPed — Setup Guide

Everything you need to get CVAPed running on a fresh Windows machine or VM. Both backend and frontend auto-bootstrap — just transfer the files and run one command in each directory.

---

## Prerequisites

| What | Why |
|---|---|
| **Python 3.10+** | Flask backend, ML models (XGBoost, librosa, scikit-learn) |
| **Node.js 18+** | React frontend (Vite build tool) |
| **MongoDB Atlas account** | Cloud database — connection string goes in `backend/.env` |
| **Firebase project** | Authentication — service account JSON in `backend/`, client keys in `frontend/.env` |

If Python or Node are missing, `npm start` will attempt to install them via `winget`. You can also install them manually:

- [python.org/downloads](https://www.python.org/downloads/) — check "Add Python to PATH"
- [nodejs.org](https://nodejs.org/) — LTS version

---

## Step 1: Transfer Files

Copy the entire project folder to your VM. That includes all `.env` files, the Firebase service account JSON, and the `node_modules` folders (optional — they'll be recreated).

```
CVAPed Web/
├── backend/       ← Flask API
├── frontend/      ← React + Vite
├── .env files included in transfer
└── Firebase JSON included in transfer
```

---

## Step 2: Backend

Open a terminal in the `backend` directory:

```bash
cd backend
npm start
```

This runs `backend/scripts/bootstrap.ps1` which checks and sets up everything automatically:

```
[1/6] Checking Python 3.10+...         → winget install if missing
[2/6] Checking configuration files...  → warns if .env or Firebase JSON missing
[3/6] Setting up Python venv...        → creates venv if needed
[4/6] Installing Python dependencies...→ pip install -r requirements.txt
[5/6] Applying frozendict patch...     → Python 3.10 compatibility fix
[6/6] Starting Flask server...         → http://localhost:5000
```

Safe to re-run anytime — skips steps that are already done.

---

## Step 3: Frontend

Open a second terminal in the `frontend` directory:

```bash
cd frontend
npm start
```

This runs `npm install` (fast no-op if already installed) then starts the Vite dev server at **http://localhost:5173**.

---

## Step 4: Open the App

Open your browser and go to:

```
http://localhost:5173
```

---

## Configuration Files

These should already be present from your transfer. If any are missing, the bootstrap script will warn you.

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing secret |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Yes | Path to Firebase admin JSON |
| `AZURE_SPEECH_KEY` | No | Azure Cognitive Services for speech scoring |
| `AZURE_SPEECH_REGION` | No | Azure region |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary for image uploads |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `WEARABLE_INGEST_TOKEN` | No | Token for ESP32 hardware |

### `frontend/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_API_URL` | Yes | Backend API URL (default: `http://localhost:5000/api`) |

### Firebase Service Account JSON

Must be present in `backend/` as `cvaped-fa8b2-firebase-adminsdk-fbsvc-92b2666b41.json` (or whatever path `FIREBASE_SERVICE_ACCOUNT_PATH` points to).

---

## Quick Reference

```
Terminal 1  →  cd backend   →  npm start   →  http://localhost:5000
Terminal 2  →  cd frontend  →  npm start   →  http://localhost:5173
Browser     →  http://localhost:5173
```

| Command | What |
|---|---|
| `cd backend && npm start` | Bootstrap + launch Flask backend |
| `cd frontend && npm start` | Install deps + launch Vite dev server |
| `cd frontend && npm run build` | Production build → `dist/` |

---

## Troubleshooting

**"python" not recognized**
Python is not installed or not in PATH. Install from [python.org](https://www.python.org/downloads/) and check "Add Python to PATH". Restart terminal and re-run.

**"node" not recognized**
Node.js is not installed or not in PATH. Install from [nodejs.org](https://nodejs.org/) (LTS). Restart terminal and re-run.

**Port 5000 already in use**
```bash
# Find and kill the process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**pip install fails**
Check your internet connection. Some ML packages (librosa, xgboost) may need Visual C++ Redistributables installed. You can also try:
```bash
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

**Flashes of red WARN messages are OK**
The bootstrap script warns about missing `.env` or Firebase JSON files. If you transferred them and they exist, the warnings are false positives — check that the files are in the right place.

**Firebase authentication fails**
Make sure the Firebase service account JSON exists in `backend/` and the Firebase web config in `frontend/.env` matches your Firebase project.
