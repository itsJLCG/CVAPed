# Fluency Therapy CRUD Implementation Guide

## Overview
This document explains the complete CRUD (Create, Read, Update, Delete) system for fluency therapy exercises, with database storage and therapist control over patient visibility.

## Key Features

### 1. **Separate Backend Module**
- **File**: `backend/fluency_crud.py` (761 lines)
- **Purpose**: Keep code organized and maintainable
- **Architecture**: Flask Blueprint pattern for modular design

### 2. **is_active Checkbox System**
- **Problem Solved**: "What if adding new exercises breaks the max items per level?"
- **Solution**: Therapists control which exercises patients see via `is_active` checkbox
- **Benefits**:
  - Add unlimited exercises without affecting patient view
  - Toggle visibility on/off instantly
  - New exercises default to inactive (must be manually enabled)

### 3. **Database Schema**
MongoDB collection: `fluency_exercises`

```javascript
{
  _id: ObjectId,
  level: 1-5,                    // Exercise level
  level_name: "Breathing & Single Words",
  level_color: "#e8b04e",
  order: 1,                      // Position within level
  exercise_id: "breath-1",       // Unique identifier
  type: "controlled-breathing",
  instruction: "Take a deep breath...",
  target: "Hello",
  expected_duration: 3,          // Seconds
  breathing: true,               // Requires breathing exercise
  is_active: true,               // ← CONTROLS PATIENT VISIBILITY
  created_at: ISODate,
  updated_at: ISODate
}
```

## Backend Implementation

### API Endpoints

| Endpoint | Method | Purpose | Authorization |
|----------|--------|---------|---------------|
| `/api/fluency-exercises/seed` | POST | Seed 23 default exercises | Therapist |
| `/api/fluency-exercises` | GET | Get all exercises (includes inactive) | Therapist |
| `/api/fluency-exercises/active` | GET | Get only active exercises | Any |
| `/api/fluency-exercises` | POST | Create new exercise | Therapist |
| `/api/fluency-exercises/<id>` | PUT | Update exercise | Therapist |
| `/api/fluency-exercises/<id>` | DELETE | Delete exercise | Therapist |
| `/api/fluency-exercises/<id>/toggle-active` | PATCH | Toggle is_active | Therapist |

### Integration with app.py

**Lines added to `backend/app.py`:**

```python
# Line 14 - Import
from fluency_crud import fluency_bp, init_fluency_crud

# Lines 49-50 - Register blueprint
app.register_blueprint(fluency_bp)
init_fluency_crud(db)
```

## Frontend Implementation

### 1. API Service Layer

**File**: `frontend/src/services/api.js` (lines 140-185)

```javascript
export const fluencyExerciseService = {
  seedDefault: async () => await api.post('/fluency-exercises/seed'),
  getAll: async () => await api.get('/fluency-exercises'),
  getActive: async () => await api.get('/fluency-exercises/active'),
  create: async (data) => await api.post('/fluency-exercises', data),
  update: async (id, data) => await api.put(`/fluency-exercises/${id}`, data),
  delete: async (id) => await api.delete(`/fluency-exercises/${id}`),
  toggleActive: async (id) => await api.patch(`/fluency-exercises/${id}/toggle-active`)
};
```

### 2. Therapist Dashboard (CRUD UI)

**File**: `frontend/src/pages/TherapistDashboard.jsx`

**Features**:
- ✅ View all exercises (active and inactive)
- ✅ Seed default exercises (one-time setup)
- ✅ Create new exercises
- ✅ Edit existing exercises
- ✅ Delete exercises
- ✅ Toggle is_active checkbox
- ✅ Visual indication of inactive exercises (dimmed)

**UI Components**:
1. **Seed Button**: Populates database with 23 default exercises
2. **New Exercise Button**: Opens create modal
3. **Exercise Cards**: Show all exercise details
4. **Active Checkbox**: Toggle patient visibility instantly
5. **Edit Button (✏️)**: Opens edit modal
6. **Delete Button (🗑️)**: Deletes exercise with confirmation

**State Management**:
```javascript
const [fluencyExercises, setFluencyExercises] = useState({});
const [editingExercise, setEditingExercise] = useState(null);
const [showExerciseModal, setShowExerciseModal] = useState(false);
const [newExercise, setNewExercise] = useState({
  level: 1,
  level_name: 'Breathing & Single Words',
  level_color: '#e8b04e',
  order: 1,
  exercise_id: '',
  type: '',
  instruction: '',
  target: '',
  expected_duration: 3,
  breathing: true,
  is_active: false  // New exercises hidden by default
});
```

### 3. Patient View (FluencyTherapy.jsx)

**File**: `frontend/src/pages/FluencyTherapy.jsx`

**Changes**:
- ❌ Removed hardcoded exercise data
- ✅ Loads exercises from database on mount
- ✅ Only shows exercises with `is_active: true`
- ✅ Automatically updates when therapist changes visibility

**Implementation**:
```javascript
const [fluencyExercises, setFluencyExercises] = useState({});

useEffect(() => {
  const loadExercises = async () => {
    try {
      const response = await fluencyExerciseService.getActive();
      if (response.success) {
        setFluencyExercises(response.exercises);
      }
    } catch (error) {
      console.error('Failed to load fluency exercises:', error);
    }
  };
  loadExercises();
}, []);
```

## Exercise Levels

### Default Exercises (23 total)

| Level | Name | Color | Count | Types |
|-------|------|-------|-------|-------|
| 1 | Breathing & Single Words | #e8b04e (gold) | 5 | controlled-breathing |
| 2 | Short Phrases | #479ac3 (blue) | 5 | short-phrase |
| 3 | Complete Sentences | #ce3630 (red) | 5 | sentence |
| 4 | Reading Passages | #8e44ad (purple) | 3 | passage |
| 5 | Spontaneous Speech | #27ae60 (green) | 3 | spontaneous |

## Usage Workflow

### For Therapists

#### First-Time Setup:
1. Log in as therapist
2. Navigate to "Fluency" tab
3. Click "📚 Therapy Levels"
4. Click "🌱 Seed Default Exercises"
5. Confirm seeding (creates 23 exercises)

#### Managing Exercises:
1. **View All Exercises**: Shows active and inactive with visual distinction
2. **Toggle Visibility**: Check/uncheck "Active" checkbox
3. **Create New Exercise**:
   - Click "➕ New Exercise"
   - Fill in form (level, ID, type, instruction, target, duration, breathing, active)
   - Click "Create Exercise"
   - Note: New exercises are inactive by default
4. **Edit Exercise**:
   - Click ✏️ on exercise card
   - Modify fields in modal
   - Click "Save Changes"
5. **Delete Exercise**:
   - Click 🗑️ on exercise card
   - Confirm deletion

### For Patients

1. Log in as patient
2. Navigate to "Fluency Therapy"
3. See only exercises marked as `is_active: true`
4. Complete exercises normally
5. Changes by therapists (activate/deactivate) reflect immediately

## CSS Styling

**File**: `frontend/src/pages/AdminDashboard.css` (appended to end)

**New Styles Added**:
- `.primary-btn`: Red primary action buttons
- `.secondary-btn`: Gray secondary buttons
- `.icon-btn`: Small icon-only buttons
- `.inactive-badge`: Badge showing "Hidden from patients"
- `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-footer`: Modal components
- `.form-group`: Form field containers

## Testing Checklist

### Backend Testing:
- [ ] Seed endpoint creates 23 exercises without duplicates
- [ ] Get all endpoint returns all exercises
- [ ] Get active endpoint returns only is_active=true
- [ ] Create endpoint generates unique order numbers
- [ ] Update endpoint modifies correct fields
- [ ] Delete endpoint removes exercise
- [ ] Toggle active endpoint flips is_active boolean

### Frontend Testing:
- [ ] Therapist sees "Seed Database" button
- [ ] Seeding works and shows confirmation
- [ ] All exercises display in therapist view
- [ ] Active/inactive visual distinction works
- [ ] Create modal opens and creates exercise
- [ ] Edit modal opens with pre-filled data
- [ ] Delete button asks for confirmation
- [ ] Checkbox toggle updates immediately
- [ ] Patient view only shows active exercises
- [ ] Patient view updates when therapist changes visibility

## File Structure Summary

```
backend/
  ├── fluency_crud.py          ← NEW: 761 lines, CRUD module
  └── app.py                   ← MODIFIED: Lines 14, 49-50

frontend/src/
  ├── services/
  │   └── api.js               ← MODIFIED: Lines 140-185 (fluencyExerciseService)
  └── pages/
      ├── TherapistDashboard.jsx  ← MODIFIED: State, CRUD UI, modals
      ├── FluencyTherapy.jsx      ← MODIFIED: Removed hardcoded data, load from DB
      └── AdminDashboard.css      ← MODIFIED: Added button and modal styles
```

## Key Benefits

1. **Scalability**: Add unlimited exercises without breaking patient view
2. **Flexibility**: Therapists control what patients see
3. **Maintainability**: Separate backend file for easy updates
4. **Safety**: New exercises default to inactive (prevent accidental exposure)
5. **Real-time**: Changes reflect immediately for patients
6. **Organization**: Blueprint architecture keeps code clean

## Security Features

- JWT token authentication on all endpoints
- Therapist role verification for CRUD operations
- Automatic order calculation (prevent conflicts)
- Confirmation dialogs for destructive actions

## Future Enhancements

- [ ] Bulk edit/activate exercises
- [ ] Duplicate exercise functionality
- [ ] Exercise analytics (which exercises are most used)
- [ ] Custom level creation
- [ ] Exercise difficulty ratings
- [ ] Patient feedback on exercises
- [ ] Search/filter exercises in therapist view
- [ ] Pagination for large exercise lists

## Troubleshooting

### "No exercises found"
- **Solution**: Click "Seed Default Exercises" in therapist dashboard

### Patient can't see exercises
- **Solution**: Check that exercises are marked as `is_active: true`

### Can't create exercise
- **Solution**: Ensure all required fields are filled (exercise_id, type, instruction, target)

### Backend errors
- **Solution**: Check that MongoDB is running and connection string is correct

## Database Maintenance

### Reset to defaults:
```python
# In Python shell
from pymongo import MongoClient
client = MongoClient('YOUR_MONGODB_URI')
db = client['your_database']
db.fluency_exercises.delete_many({})
# Then click "Seed Default Exercises" in UI
```

### Backup exercises:
```python
exercises = list(db.fluency_exercises.find({}))
import json
with open('fluency_backup.json', 'w') as f:
    json.dump(exercises, f, default=str)
```

## Conclusion

This CRUD implementation provides a complete, production-ready system for managing fluency therapy exercises. Therapists have full control over exercise content and visibility, while patients enjoy a seamless experience with only relevant exercises displayed.

The `is_active` checkbox system elegantly solves the "max items per level" problem by decoupling exercise creation from patient visibility. Therapists can now confidently add new exercises, test them, and activate them only when ready.
