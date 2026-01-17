# CVACare - Setup Guide

Simple step-by-step guide to set up and run CVACare on your computer.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Running the Application](#running-the-application)
4. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Download and install these programs first:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
   - Download the Windows installer (.msi)
   - Run installer and follow the steps
   - Check all boxes during installation

2. **Python** (v3.8 or higher) - [Download here](https://www.python.org/)
   - Download the Windows installer
   - **IMPORTANT:** Check "Add Python to PATH" during installation
   - Click "Install Now"

3. **Git** (optional, only if downloading from GitHub) - [Download here](https://git-scm.com/)

---

## Installation Steps

### Step 1: Get the Project Files

**Option A: Download ZIP**
- Download the project ZIP file
- Extract to a folder (e.g., `C:\CVACare_Thesis`)

**Option B: Clone from GitHub**
- Open Command Prompt
- Navigate to where you want the project:
```bash
cd C:\
git clone https://github.com/YOUR-USERNAME/CVACare_Thesis.git
### Step 2: Setup Backend

1. **Open Command Prompt** in the project folder
   - Right-click the `CVACare_Thesis` folder
   - Select "Open in Terminal" or "Open Command Prompt here"

2. **Go to backend folder:**
```bash
cd backend
```

3. **Create Python virtual environment:**
```bash
python -m venv venv
```

4. **Activate virtual environment:**
```bash
venv\Scripts\activate
```
   - You should see `(venv)` appear before your command prompt

5. **Install all required packages:**
```bash
pip install -r requirements.txt
```
   - This will take a few minutes
   - It installs Flask, MongoDB, Firebase, and all other dependencies
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `cvaped-fa8b2-firebase-adminsdk-fbsvc-92b2666b41.json` in the `backend` directory

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory
Open a **new terminal** and run:
```bash
cd frontend
```

### Step 2: Install Node Dependencies
```bash
npm install
```

This will install:
- React & React DOM
- React Router DOM (Navigation)
- Axios (HTTP client)
- Firebase (Authentication)
- Framer Motion (Animations)
- WaveSurfer.js (Audio visualization)
- React Icons
- Vite (Build tool)
- And other dependencies

### Step 3: Configure Firebase Client
1. Create `src/firebase/config.js` file:
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
### Step 3: Setup Frontend

1. **Open a NEW Command Prompt window**

2. **Go to the project folder, then frontend:**
```bash
cd C:\CVACare_Thesis\frontend
```
   - Change the path if you extracted to a different location

3. **Install all frontend packages:**
```bash
npm install
```
   - This will take a few minutes
   - It installs React, Vite, and all other dependencies
**Problem: `ModuleNotFoundError: No module named 'flask'`**
- Solution: Make sure virtual environment is activated and run `pip install -r requirements.txt`

**Problem: `pymongo.errors.ConfigurationError`**
- Solution: Check your MongoDB connection string in `.env` file
- Make sure your IP is whitelisted in MongoDB Atlas

**Problem: `FileNotFoundError: Firebase credentials file not found`**
- Solution: Make sure `cvaped-fa8b2-firebase-adminsdk-fbsvc-92b2666b41.json` exists in backend folder
- Check the path in `.env` file

**Problem: Port 5000 already in use**
- Solution: Change port in `.env` file or stop the process using port 5000
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

## Running the Application

You need **TWO Command Prompt windows** open - one for backend, one for frontend.

### Window 1: Start Backend Server

1. Open Command Prompt in `CVACare_Thesis\backend`
2. Activate virtual environment:
```bash
venv\Scripts\activate
```
3. Run the server:
```bash
python app.py
```
4. **Keep this window open!** You should see:
```
* Running on http://localhost:5000
```

### Window 2: Start Frontend Server

1. Open another Command Prompt in `CVACare_Thesis\frontend`
2. Run the development server:
```bash
npm run dev
```
3. **Keep this window open!** You should see:
```
Local: http://localhost:5173/
```

### Open the Application

1. Open your web browser (Chrome, Edge, Firefox)
2. Go to: **http://localhost:5173**
## Quick Start Summary

1. Install Node.js and Python
2. Extract/download project files
3. Open Command Prompt in `backend` folder
   - Run: `python -m venv venv`
   - Run: `venv\Scripts\activate`
   - Run: `pip install -r requirements.txt`
   - Run: `python app.py` (keep open)
4. Open another Command Prompt in `frontend` folder
   - Run: `npm install`
   - Run: `npm run dev` (keep open)
5. Open browser: http://localhost:5173

---

## What You'll See

After successful setup:
- **Landing                # Python Flask server
│   ├── app.py            # Main server file
│   ├── requirements.txt  # Python packages list
│   ├── venv/            # Virtual environment (created during setup)
│   ├── *.py             # Therapy modules and APIs
│   └── models/          # Machine learning models
│
└── frontend/             # React web application
    ├── src/             # Source code
    │   ├── pages/       # All pages (Login, Dashboard, etc.)
    │   ├── components/  # Reusable components
    │   └── services/    # API connections
    ├── package.json     # Node packages list
    └── node_modules/    # Installed packages (created during setup)
```

---

## Technologies Used

- **Frontend:** React + Vite
- **Backend:** Python Flask
- **Database:** MongoDB
- **Authentication:** Firebase + JWT
- **Machine Learning:** XGBoost, scikit-learn
- **Audio Processing:** librosa, WaveSurfer.js
---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review error messages in browser console (F12)
- Check backend terminal logs
- Verify all environment variables are set correctly

---

## Contributors

**TUP-Taguig & Taguig Physical Medicine and Rehabilitation Unit**
- Ludwig Gayapa
- Gwyn Barte
- Kristine Mae Prado
- Jhun Mark Obreros

---

## License

This project is developed as a thesis project for educational purposes.

---

**Happy Coding! 🚀**
Tips

- **Always activate virtual environment** before running backend
- **Keep both Command Prompts open** while using the app
- **Use Google Chrome** for best experience
- If something breaks, restart both servers

---

## Need Help?

1. Read the [Troubleshooting](#troubleshooting) section
2. Check error messages in Command Prompt windows
3. Press F12 in browser to see console errors
4. Make sure both servers are running

---

## Project Team

**TUP-Taguig & Taguig Physical Medicine and Rehabilitation Unit**
- Ludwig Gayapa
- Gwyn Barte
- Kristine Mae Prado
- Jhun Mark Obreros

---

**That's it! You're ready to use CVACare! 🎉


cd backend
venv\Scripts\activate
python app.py

cd frontend
npm run dev