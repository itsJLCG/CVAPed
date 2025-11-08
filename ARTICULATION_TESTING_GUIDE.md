# Articulation CRUD Testing Guide

## Quick Start Testing

### Step 1: Restart Backend
```bash
# Stop current backend (Ctrl+C)
cd backend
python app.py
```

**Expected Output**:
```
✓ Registered blueprint: articulation_bp
✓ Initialized collection: articulation_exercises
* Running on http://127.0.0.1:5000
```

---

### Step 2: Seed Default Exercises

1. **Login as Therapist**
2. **Navigate**: Articulation Therapy tab
3. **Click**: "Exercise Levels" sub-tab
4. **Click**: "Seed Default Exercises" button

**Expected Result**:
- ✓ Success message appears
- ✓ Exercises load automatically
- ✓ Sound tabs show (S, R, L, K, TH)
- ✓ Each sound has exercises grouped by level

---

### Step 3: Test Sound Tabs

**Click each sound tab**: S | R | L | K | TH

**Expected for Each Sound**:
- ✓ Level 1 (Sound): 1 exercise
- ✓ Level 2 (Syllable): 3 exercises
- ✓ Level 3 (Word): 2 exercises
- ✓ Level 4 (Phrase): 2 exercises
- ✓ Level 5 (Sentence): 2 exercises
- ✓ **Total**: 10 exercises per sound

---

### Step 4: Create New Exercise

1. **Click**: "New Exercise" button
2. **Fill Form**:
   - Exercise ID: `s-word-3`
   - Sound: `S Sound`
   - Level: `3 - Word`
   - Target: `super`
   - Order: `3`
   - ✓ Active checkbox checked
3. **Click**: "Create"

**Expected Result**:
- ✓ Modal closes
- ✓ New exercise appears in S Sound → Level 3
- ✓ Exercise shows: #3, s-word-3, "super", order 3, ✓ active

---

### Step 5: Edit Exercise

1. **Find**: Any exercise in the list
2. **Click**: "Edit" button
3. **Modify**: Change target text (e.g., "super" → "superman")
4. **Click**: "Update"

**Expected Result**:
- ✓ Modal closes
- ✓ Exercise updates immediately
- ✓ New target text displays

---

### Step 6: Toggle Active State

1. **Find**: Any exercise with ✓ active checkbox
2. **Click**: Uncheck the active checkbox
3. **Check**: Database (exercise is_active should be false)

**Expected Result**:
- ✓ Checkbox unchecks
- ✓ Exercise still visible to therapist
- ✓ Exercise hidden from patient (test in Step 8)

---

### Step 7: Delete Exercise

1. **Find**: Any exercise (e.g., the one you created)
2. **Click**: "Delete" button
3. **Confirm**: Deletion in confirmation dialog

**Expected Result**:
- ✓ Exercise removed from list
- ✓ Other exercises remain
- ✓ No errors in console

---

### Step 8: Test Patient Side

1. **Logout** (if logged in as therapist)
2. **Login as Patient**
3. **Navigate**: Dashboard → Articulation Therapy
4. **Select**: S Sound

**Expected Result**:
- ✓ "Loading exercises..." appears briefly
- ✓ Only **active** exercises load
- ✓ Inactive exercises NOT visible
- ✓ Exercises sorted by order field
- ✓ Can record and practice as normal

**Test Each Sound**:
- ✓ S Sound → loads S exercises
- ✓ R Sound → loads R exercises
- ✓ L Sound → loads L exercises
- ✓ K Sound → loads K exercises
- ✓ TH Sound → loads TH exercises

---

### Step 9: Test "No Exercises" State

**As Therapist**:
1. **Go to**: S Sound tab
2. **Uncheck**: All active checkboxes for S Sound
3. **Save changes**

**As Patient**:
1. **Navigate**: Articulation Therapy
2. **Select**: S Sound

**Expected Result**:
- ✓ Shows: "No exercises available"
- ✓ Message: "Please contact your therapist to add exercises for this sound."
- ✓ No errors or crashes

---

### Step 10: Test Recording and Progress

**As Patient**:
1. **Select**: Any sound with active exercises
2. **Start**: Exercise
3. **Record**: Audio
4. **Complete**: Level

**Expected Result**:
- ✓ Recording works as before
- ✓ Scoring works
- ✓ Progress saves
- ✓ Level completion triggers
- ✓ Next level unlocks
- ✓ No errors in console

---

## Verification Checklist

### Backend
- [ ] Backend restarts without errors
- [ ] Blueprint registered successfully
- [ ] Collection initialized
- [ ] Seed endpoint creates 50 exercises
- [ ] All 8 endpoints respond correctly

### Therapist Dashboard
- [ ] Seed button works
- [ ] Sound tabs switch correctly
- [ ] Exercises grouped by level
- [ ] Create modal opens/closes
- [ ] New exercise appears in list
- [ ] Edit modal opens/closes
- [ ] Exercise updates save
- [ ] Active checkbox toggles
- [ ] Delete removes exercise
- [ ] No console errors

### Patient Side
- [ ] Exercises load from database
- [ ] Only active exercises visible
- [ ] Sound selection works
- [ ] Recording functionality intact
- [ ] Progress saves correctly
- [ ] Level completion works
- [ ] "No exercises" message shows when appropriate
- [ ] No console errors

### Edge Cases
- [ ] Creating duplicate exercise_id shows error
- [ ] Deleting last exercise in level works
- [ ] Toggling all inactive shows "no exercises"
- [ ] Switching sounds while practicing works
- [ ] Multiple therapists editing simultaneously
- [ ] Patient using exercise while therapist deletes it

---

## Common Issues and Solutions

### Issue 1: "Blueprint not registered"
**Solution**: 
```bash
cd backend
python app.py
# Check console for "Registered blueprint: articulation_bp"
```

### Issue 2: "No exercises load"
**Solution**:
- Check if seed was successful
- Verify MongoDB connection
- Check browser console for errors
- Verify JWT token is valid

### Issue 3: "Exercise doesn't appear after create"
**Solution**:
- Check network tab for 200 response
- Verify correct sound tab is selected
- Refresh the exercises list
- Check MongoDB for created document

### Issue 4: "Patient sees inactive exercises"
**Solution**:
- Verify using `getActive(soundId)` endpoint (not `getAll()`)
- Check exercise `is_active` field in database
- Clear browser cache
- Re-login as patient

### Issue 5: "Recording doesn't work"
**Solution**:
- This is unchanged from before
- Check microphone permissions
- Verify backend API is running
- Check network tab for /record endpoint

---

## Database Verification

### Check MongoDB Directly

```javascript
// Connect to MongoDB
use cvaped-fa8b2

// Count total exercises
db.articulation_exercises.countDocuments()
// Expected: 50 (after seed)

// Count by sound
db.articulation_exercises.countDocuments({ sound_id: 's' })
// Expected: 10

// Find active exercises for S Sound
db.articulation_exercises.find({ 
  sound_id: 's', 
  is_active: true 
}).pretty()

// Find all exercises grouped by level
db.articulation_exercises.aggregate([
  { $group: { 
    _id: { sound: "$sound_id", level: "$level" },
    count: { $sum: 1 }
  }},
  { $sort: { "_id.sound": 1, "_id.level": 1 }}
])
```

---

## Performance Testing

### Load Time
- [ ] Therapist dashboard loads in < 2 seconds
- [ ] Patient exercises load in < 1 second
- [ ] Sound tab switching is instant
- [ ] Create/edit modals open instantly

### Scalability
- [ ] Test with 100+ exercises per sound
- [ ] Test with 10+ levels
- [ ] Test with multiple therapists editing
- [ ] Test with 50+ patients using simultaneously

---

## Success Indicators

### ✅ Fully Working When:
1. Backend starts without errors
2. Seed creates 50 exercises
3. Therapist can create/edit/delete exercises
4. Sound tabs work correctly
5. Active/inactive toggle works
6. Patient sees only active exercises
7. Recording and progress work as before
8. No console errors
9. UI is responsive
10. Database updates in real-time

---

## Next Steps After Testing

1. **If all tests pass**:
   - ✓ Mark as production-ready
   - ✓ Deploy to staging environment
   - ✓ User acceptance testing
   - ✓ Production deployment

2. **If issues found**:
   - Document specific errors
   - Check browser console
   - Check backend logs
   - Verify database state
   - Fix and re-test

---

## Testing Complete! 🎉

Once all tests pass, the articulation CRUD system is ready for production use.
