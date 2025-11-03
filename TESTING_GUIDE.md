# 🚀 Testing Guide - Articulation Therapy

## Quick Start (5 Steps)

### Step 1: Start Backend Server
```powershell
# Open Terminal 1 (PowerShell) in backend folder
cd C:\Users\ludwi\CVACare_Thesis\backend

# Activate virtual environment
.\venv\Scripts\Activate

# Start Flask server
python app.py
```

**Expected Output:**
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

---

### Step 2: Start Frontend Dev Server
```powershell
# Open Terminal 2 (PowerShell) in frontend folder
cd C:\Users\ludwi\CVACare_Thesis\frontend

# Start Vite dev server
npm run dev
```

**Expected Output:**
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Step 3: Open Browser
Navigate to: **http://localhost:5173**

---

### Step 4: Login/Register
1. Click "Get Started" on landing page
2. Register a new account OR login with existing
3. You'll be redirected to Therapy Selection

---

### Step 5: Test Articulation Therapy

#### 5.1 Navigate to Articulation
1. Click **"Speech Therapy"** card
2. Click **"Articulation Therapy"** card
3. You'll see 5 target sounds: /s/, /r/, /l/, /k/, /th/

#### 5.2 Select a Sound
1. Click any sound card (e.g., **"S Sound"**)
2. You'll enter the exercise page for that sound

#### 5.3 Complete Exercise Flow
1. **Listen to Model** - Click to hear pronunciation (currently shows alert)
2. **Start Recording** - Click the microphone button
3. **Speak clearly** - Say the target word/phrase
4. **Stop Recording** - Automatically stops after 5 seconds OR click stop
5. **Wait for Processing** - Spinner shows while analyzing (2 seconds mock delay)
6. **View Score** - See your score (85-100% mock range)
7. **Complete 3 Trials** - Repeat 3 times
8. **Check Average** - Must score ≥90% average to proceed
9. **Next Item** - Click to move to next exercise
10. **Level Up** - Complete all 3 items to unlock next level

---

## 🎯 What You're Testing

### ✅ Frontend Features (All Working)
- [x] Sound selection page (5 sounds)
- [x] Exercise page layout
- [x] Level indicators (1-5)
- [x] Item progress (1/3, 2/3, 3/3)
- [x] Audio recording (MediaRecorder API)
- [x] Waveform visualization (WaveSurfer.js)
- [x] Trial counter (1/3, 2/3, 3/3)
- [x] Score display (individual + average)
- [x] Color-coded feedback (green/red)
- [x] Navigation (back, logout)
- [x] Responsive design

### ✅ Real Backend (Now Working!)
- [x] **Real Whisper ASR** - Transcribes your actual speech
- [x] **Real scoring** - Compares what you said vs. target
- [x] **Web Speech API** - "Listen to Model" now speaks the target
- [x] **Audio processing** - Uses jiwer for Word Error Rate
- [ ] Advanced phoneme analysis (simplified version working, Montreal Forced Aligner pending)
- [ ] Audio file storage (temporary files only)
- [ ] MongoDB progress tracking (not implemented yet)

### 🔧 Backend API Endpoints Added
- `POST /api/articulation/record` - Process recording (mock)
- `GET /api/articulation/exercises/:soundId/:level` - Get exercises (mock)
- `GET /api/articulation/progress/:patientId/:soundId` - Get progress (mock)

---

## 🐛 Troubleshooting

### Backend won't start?
```powershell
# Make sure you're in backend folder
cd C:\Users\ludwi\CVACare_Thesis\backend

# Check if virtual environment is activated (you should see (venv))
.\venv\Scripts\Activate

# Try running again
python app.py
```

### Frontend won't start?
```powershell
# Make sure you're in frontend folder
cd C:\Users\ludwi\CVACare_Thesis\frontend

# Check if dependencies are installed
npm install

# Try running again
npm run dev
```

### Recording doesn't work?
- **Check microphone permissions** in browser
- Allow microphone access when prompted
- Try Chrome/Edge (best MediaRecorder support)

### Waveform doesn't show?
- This is normal - waveform appears AFTER you stop recording
- Recording must complete before visualization

### Can't proceed to next item?
- Must complete 3 trials
- Average score must be ≥90%
- If you fail, you'll see "Request Therapist Review" button

---

## 📊 Testing Checklist

### Basic Flow
- [ ] Can register/login
- [ ] Can access therapy selection
- [ ] Can navigate to speech therapy types
- [ ] Can navigate to articulation sounds
- [ ] Can enter exercise page

### Recording
- [ ] Can click "Start Recording" button
- [ ] Browser asks for microphone permission
- [ ] Can record audio (button shows "Stop Recording")
- [ ] Recording stops after 5 seconds
- [ ] Waveform appears after recording

### Scoring
- [ ] Score appears after processing (2 second delay)
- [ ] Score is between 85-100% (mock range)
- [ ] Trial counter increments (1→2→3)
- [ ] Individual trial scores display
- [ ] Average score calculated after 3 trials
- [ ] Green color if ≥90%, red if <90%

### Progression
- [ ] "Next Item" unlocks if average ≥90%
- [ ] Can move to item 2, then item 3
- [ ] Level indicator updates
- [ ] Level completion alert shows
- [ ] Can progress through all 5 levels
- [ ] Returns to sound selection after level 5

### UI/UX
- [ ] All buttons responsive
- [ ] Hover effects work
- [ ] Mobile responsive (resize browser)
- [ ] Logout works
- [ ] Back button works

---

## 🎬 Expected User Journey

```
Login/Register
    ↓
Therapy Selection
    ↓
Speech Therapy Types (3 types)
    ↓
Articulation Sounds (5 sounds)
    ↓
Exercise Page → S Sound, Level 1, Item 1
    ↓
Listen to Model → "s"
    ↓
Record 3 Trials → Score: 92%, 88%, 95% → Average: 91.67%
    ↓
Next Item → S Sound, Level 1, Item 2
    ↓
Listen to Model → "sss"
    ↓
Record 3 Trials → Score: 91%, 93%, 89% → Average: 91%
    ↓
Next Item → S Sound, Level 1, Item 3
    ↓
Listen to Model → "hiss"
    ↓
Record 3 Trials → Score: 90%, 92%, 94% → Average: 92%
    ↓
Complete Level → "🎉 Level 1 Complete! Moving to Level 2: Syllable"
    ↓
... Continue through levels 2-5 ...
    ↓
Complete All Levels → "🎉 Congratulations! You completed all levels!"
    ↓
Return to Sound Selection → Choose another sound
```

---

## 📸 What You Should See

### 1. Sound Selection Page
- 5 colorful cards with sound symbols
- Example words for each sound
- "How It Works" section

### 2. Exercise Page Header
- Sound name + level name (e.g., "S Sound - Level 1: Sound")
- 5 circular level indicators
- Item progress counter

### 3. Target Display
- Large target text (word/phrase/sentence)
- "Listen to Model" button

### 4. Recording Area
- Trial counter
- Waveform container (gray box)
- Recording button (changes to "Stop" when recording)
- Processing spinner when analyzing

### 5. Scores Section
- Individual trial scores in cards
- Average score prominently displayed
- Success/warning message
- Action buttons (Try Again / Next Item / Request Review)

---

## 🔜 Next Steps (After Testing)

Once you confirm everything works:

1. **Replace Mock Scoring** with real Whisper ASR
2. **Add Phoneme Analysis** using librosa
3. **Implement Audio Storage** (save .wav files)
4. **Create MongoDB Collections** for exercises/attempts/progress
5. **Add Therapist Review Dashboard**
6. **Build Language & Fluency Therapy** pages

---

## 💡 Quick Test Commands

### Terminal 1 (Backend)
```powershell
cd C:\Users\ludwi\CVACare_Thesis\backend
.\venv\Scripts\Activate
python app.py
```

### Terminal 2 (Frontend)
```powershell
cd C:\Users\ludwi\CVACare_Thesis\frontend
npm run dev
```

### Browser
```
http://localhost:5173
```

**That's it! Start testing! 🚀**
