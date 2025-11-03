# Articulation Therapy - Implementation Guide

## ✅ Current Status

### Phase 1: Sound Selection Page ✓ COMPLETE
- Created `ArticulationTherapy.jsx` with 5 target sounds (/s/, /r/, /l/, /k/, /th/)
- Styled with `ArticulationTherapy.css`
- Added routing in `App.jsx`
- Linked from Speech Therapy Types page

## 🎯 Next Steps

### Phase 2: Level Progression & Exercise Page
Create `ArticulationExercise.jsx` for individual sound practice.

### Phase 3: Recording & Scoring System
Implement audio recording and pronunciation scoring.

---

## 📋 Database Schema (MongoDB)

### Collection: `articulation_exercises`
```javascript
{
  sound_id: "s",           // s, r, l, k, th
  level: 1,                // 1-5 (Sound, Syllable, Word, Phrase, Sentence)
  item_number: 1,          // 1-3
  target: "sun",           // The word/phrase/sentence to practice
  audio_url: "s3://...",   // Optional: model pronunciation audio
  order: 1                 // Display order
}
```

### Collection: `articulation_attempts`
```javascript
{
  patient_id: "p001",
  exercise_id: "art_s_word_01",
  sound_id: "s",
  level: 3,                // Word level
  target: "sun",
  trial: 2,                // Trial 1, 2, or 3
  file_path: "s3://bucket/.../rec001.wav",
  duration_ms: 2100,
  asr_text: "sun",
  asr_confidence: 0.93,
  phoneme_score: 0.96,     // From forced alignment
  computed_score: 0.94,    // Average of ASR + phoneme scores
  therapist_override: null, // null or 0-1 score
  created_at: "2025-11-03T10:30:00Z"
}
```

### Collection: `patient_progress`
```javascript
{
  patient_id: "p001",
  sound_id: "s",
  current_level: 3,        // Current unlocked level (1-5)
  level_1_score: 0.95,     // Best score for Sound level
  level_2_score: 0.92,     // Best score for Syllable level
  level_3_score: null,     // Not yet completed
  level_4_score: null,
  level_5_score: null,
  updated_at: "2025-11-03T10:30:00Z"
}
```

---

## 🛠️ Tools & Libraries Needed

### Frontend (Already Have)
- ✅ React + Vite
- ✅ react-router-dom

### Frontend (To Add)
```bash
npm install wavesurfer.js           # Audio waveform visualization
npm install react-hook-form         # Form handling
npm install framer-motion           # Animations for kid-friendly UI
```

### Backend (Current: Flask)
**Option A: Keep Flask** - Add these packages:
```bash
pip install whisper                 # OpenAI Whisper for ASR
pip install jiwer                   # Word Error Rate calculation
pip install librosa                 # Audio preprocessing
pip install pydub                   # Audio format conversion
pip install boto3                   # S3/MinIO storage (optional)
```

**Option B: Switch to FastAPI** (Recommended for async processing):
```bash
pip install fastapi uvicorn         # FastAPI framework
pip install motor                   # Async MongoDB driver
pip install celery redis            # Background task processing
pip install whisper jiwer librosa pydub
```

### Speech Analysis Tools
```bash
# Montreal Forced Aligner (for phoneme-level scoring)
# Install separately: https://montreal-forced-aligner.readthedocs.io/

# OR use Gentle (simpler alternative)
pip install gentle
```

---

## 🎨 Frontend Implementation Plan

### 1. Create Exercise Page Component
**File:** `frontend/src/pages/ArticulationExercise.jsx`

**Features:**
- Display current sound, level, and exercise target
- Show 3 items per level
- Audio playback of model pronunciation
- Record button (2-3 trials per item)
- Visual feedback (waveform, recording status)
- Score display after each trial
- Progress bar (3/9 items completed)
- "Next" button (unlocks when avg_score ≥ 0.90)

**URL:** `/articulation/:soundId`

### 2. Level Structure
```
Level 1: Sound       → 3 items (e.g., "s", "sss", "hiss")
Level 2: Syllable    → 3 items (e.g., "sa", "se", "si")
Level 3: Word        → 3 items (e.g., "sun", "sock", "sip")
Level 4: Phrase      → 3 items (e.g., "See the sun.")
Level 5: Sentence    → 3 items (e.g., "Sam saw seven shiny shells.")
```

### 3. Recording Flow
```
1. User clicks "Listen" → Play model audio
2. User clicks "Record" → Start recording (max 5 seconds)
3. Recording complete → Auto-send to backend
4. Backend processes → Returns score
5. Display score + visual feedback
6. Allow 2 more trials (3 total)
7. Calculate average score
8. If avg ≥ 0.90 → Unlock next item/level
9. If < 0.90 → Show "Try Again" or "Therapist Review"
```

---

## 🔧 Backend Implementation Plan

### 1. Create API Endpoints

#### GET `/api/articulation/exercises/:soundId/:level`
```javascript
// Returns 3 exercises for a given sound and level
Response: [
  {
    id: "art_s_word_01",
    sound_id: "s",
    level: 3,
    item_number: 1,
    target: "sun",
    audio_url: "/static/audio/s_word_sun.mp3"
  },
  // ... 2 more items
]
```

#### POST `/api/articulation/record`
```javascript
// Upload audio file and metadata
Request: {
  patient_id: "p001",
  exercise_id: "art_s_word_01",
  sound_id: "s",
  level: 3,
  target: "sun",
  trial: 1,
  audio: <File>  // WAV or MP3
}

Response: {
  attempt_id: "att_123",
  asr_text: "sun",
  asr_confidence: 0.93,
  phoneme_score: 0.96,
  computed_score: 0.94,
  feedback: "Great job! Try to emphasize the 's' sound more."
}
```

#### GET `/api/articulation/progress/:patientId/:soundId`
```javascript
// Get patient progress for a sound
Response: {
  sound_id: "s",
  current_level: 3,
  level_scores: [0.95, 0.92, null, null, null],
  total_attempts: 18,
  best_score: 0.95
}
```

#### POST `/api/articulation/therapist-review`
```javascript
// Therapist override score
Request: {
  attempt_id: "att_123",
  override_score: 0.85
}
```

### 2. Audio Processing Pipeline

```python
# Pseudocode for backend processing

def process_audio_attempt(audio_file, target, sound_id, level):
    # 1. Preprocess audio
    audio = preprocess_audio(audio_file)  # Resample to 16kHz, trim silence
    
    # 2. Speech-to-text (ASR)
    asr_result = whisper_transcribe(audio)
    asr_text = asr_result['text']
    asr_confidence = asr_result['confidence']
    
    # 3. Phoneme-level analysis (for /s/, /r/, etc.)
    phoneme_score = compute_phoneme_score(audio, target, sound_id)
    
    # 4. Combine scores
    computed_score = (asr_confidence * 0.4) + (phoneme_score * 0.6)
    
    # 5. Generate feedback
    feedback = generate_feedback(computed_score, sound_id, level)
    
    # 6. Store in MongoDB
    save_attempt(patient_id, exercise_id, audio_path, scores, feedback)
    
    return {
        'asr_text': asr_text,
        'asr_confidence': asr_confidence,
        'phoneme_score': phoneme_score,
        'computed_score': computed_score,
        'feedback': feedback
    }
```

### 3. Phoneme Scoring (Advanced)

```python
# Using Montreal Forced Aligner or Gentle

def compute_phoneme_score(audio, target, sound_id):
    # 1. Forced alignment to get phoneme timestamps
    alignment = mfa_align(audio, target)
    
    # 2. Extract target phoneme (e.g., /s/ in "sun")
    target_phoneme = get_target_phoneme(target, sound_id)
    phoneme_segment = extract_phoneme_segment(alignment, target_phoneme)
    
    # 3. Compute phoneme error rate
    error_rate = compute_phoneme_error(phoneme_segment, target_phoneme)
    
    # 4. Convert to score (1.0 - error_rate)
    score = 1.0 - error_rate
    
    return score
```

---

## 📊 Scoring Logic

### Pass Threshold
- Default: `avg_score >= 0.90` (90%)
- Configurable per exercise or patient

### Score Calculation
```
computed_score = (asr_confidence * 0.4) + (phoneme_score * 0.6)

Where:
- asr_confidence: 0-1 (from Whisper or Google STT)
- phoneme_score: 0-1 (from forced aligner)
```

### Trial Averaging
```
# User completes 3 trials for "sun"
trial_1_score = 0.85
trial_2_score = 0.92
trial_3_score = 0.90

avg_score = (0.85 + 0.92 + 0.90) / 3 = 0.89

# Result: avg_score < 0.90 → User must retry or wait for therapist review
```

### Level Unlocking
```
Level 1 (Sound):    Unlock when avg_score >= 0.90 on all 3 items
Level 2 (Syllable): Unlock when Level 1 complete
Level 3 (Word):     Unlock when Level 2 complete
Level 4 (Phrase):   Unlock when Level 3 complete
Level 5 (Sentence): Unlock when Level 4 complete
```

---

## 🎯 Exercise Content (Seeded Data)

### Sound /s/ (sound_id: "s")

#### Level 1: Sound
```javascript
{ id: "art_s_sound_01", target: "s", audio_url: "/audio/s_sound_1.mp3" }
{ id: "art_s_sound_02", target: "sss", audio_url: "/audio/s_sound_2.mp3" }
{ id: "art_s_sound_03", target: "hiss", audio_url: "/audio/s_sound_3.mp3" }
```

#### Level 2: Syllable
```javascript
{ id: "art_s_syllable_01", target: "sa", audio_url: "/audio/s_syllable_sa.mp3" }
{ id: "art_s_syllable_02", target: "se", audio_url: "/audio/s_syllable_se.mp3" }
{ id: "art_s_syllable_03", target: "si", audio_url: "/audio/s_syllable_si.mp3" }
```

#### Level 3: Word
```javascript
{ id: "art_s_word_01", target: "sun", audio_url: "/audio/s_word_sun.mp3" }
{ id: "art_s_word_02", target: "sock", audio_url: "/audio/s_word_sock.mp3" }
{ id: "art_s_word_03", target: "sip", audio_url: "/audio/s_word_sip.mp3" }
```

#### Level 4: Phrase
```javascript
{ id: "art_s_phrase_01", target: "See the sun.", audio_url: "/audio/s_phrase_1.mp3" }
{ id: "art_s_phrase_02", target: "Sit down.", audio_url: "/audio/s_phrase_2.mp3" }
{ id: "art_s_phrase_03", target: "Pass the salt.", audio_url: "/audio/s_phrase_3.mp3" }
```

#### Level 5: Sentence
```javascript
{ id: "art_s_sentence_01", target: "Sam saw seven shiny shells.", audio_url: "/audio/s_sent_1.mp3" }
{ id: "art_s_sentence_02", target: "The sun is very hot.", audio_url: "/audio/s_sent_2.mp3" }
{ id: "art_s_sentence_03", target: "She sells sea shells.", audio_url: "/audio/s_sent_3.mp3" }
```

**(Repeat similar structure for /r/, /l/, /k/, /th/ sounds)**

---

## 🚀 MVP Development Roadmap

### Week 1: Exercise Page UI
- [ ] Create `ArticulationExercise.jsx` component
- [ ] Display exercise target (text + optional image)
- [ ] Add "Listen" button (playback model audio)
- [ ] Add "Record" button (use MediaRecorder API)
- [ ] Show recording status (Recording... → Processing...)
- [ ] Display waveform with wavesurfer.js

### Week 2: Backend API
- [ ] Create Flask/FastAPI endpoints (GET exercises, POST recordings)
- [ ] Implement audio upload & storage (local or S3)
- [ ] Integrate Whisper for ASR transcription
- [ ] Calculate basic score (ASR confidence only)
- [ ] Return score + feedback to frontend

### Week 3: Scoring & Progression
- [ ] Add phoneme-level scoring (MFA or Gentle)
- [ ] Implement trial averaging (3 trials per item)
- [ ] Add level unlocking logic (90% threshold)
- [ ] Store progress in MongoDB
- [ ] Display progress bar & level badges

### Week 4: Therapist Dashboard
- [ ] Create therapist review UI
- [ ] Allow score override
- [ ] View patient progress reports
- [ ] Download audio recordings

---

## 📦 Installation Commands

### Frontend Dependencies
```bash
cd frontend
npm install wavesurfer.js framer-motion react-hook-form
```

### Backend Dependencies (Flask)
```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install openai-whisper jiwer librosa pydub soundfile
pip install boto3  # If using S3
```

### Backend Dependencies (FastAPI - Optional)
```bash
pip install fastapi uvicorn motor celery redis
pip install openai-whisper jiwer librosa pydub soundfile
```

---

## 🔊 Audio Recording (Frontend)

```javascript
// Using MediaRecorder API (built-in browser API)

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    await uploadAudio(audioBlob);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // Max 5 seconds
};

const uploadAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('patient_id', 'p001');
  formData.append('exercise_id', 'art_s_word_01');
  formData.append('target', 'sun');
  formData.append('trial', 1);

  const response = await fetch('/api/articulation/record', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  console.log('Score:', result.computed_score);
};
```

---

## ✅ Summary

### ✓ Completed
1. Articulation Therapy sound selection page
2. 5 target sounds with descriptions
3. Routing and navigation

### → Next Priority
1. Create exercise page with recording UI
2. Set up backend API for audio processing
3. Integrate Whisper for ASR
4. Implement basic scoring

### Tools Needed
- **Frontend:** wavesurfer.js, framer-motion
- **Backend:** Whisper, jiwer, librosa, pydub
- **Optional:** FastAPI, Celery, Redis, MFA/Gentle

---

**Need help with any specific part? Let me know!** 🚀
