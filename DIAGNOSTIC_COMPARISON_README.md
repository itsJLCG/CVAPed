# Diagnostic Comparison & Validation Feature

## 📋 Table of Contents
- [Feature Overview](#feature-overview)
- [Purpose & Benefits](#purpose--benefits)
- [User Roles & Access](#user-roles--access)
- [Usage Instructions](#usage-instructions)
  - [For Therapists](#for-therapists)
  - [For Patients](#for-patients)
- [Data Flow & Architecture](#data-flow--architecture)
- [Metrics Compared](#metrics-compared)
- [Understanding the Comparison Output](#understanding-the-comparison-output)
- [API Endpoints](#api-endpoints)
- [Implementation Details](#implementation-details)
- [Notes & Considerations](#notes--considerations)

---

## 🎯 Feature Overview

The **Diagnostic Comparison & Validation** feature is a clinical analytics tool that compares baseline assessments conducted at healthcare facilities with ongoing performance data collected from at-home therapy sessions. This feature bridges the gap between professional clinical evaluations and patient self-practice, providing therapists and patients with actionable insights into therapy progress.

### Key Capabilities:
- **Baseline vs. Current Performance**: Compare facility-based diagnostic assessments with real-time at-home therapy performance
- **Multi-Domain Analysis**: Track progress across articulation, fluency, receptive language, expressive language, and gait
- **Historical Trending**: View assessment history over time to identify long-term patterns
- **Delta Calculations**: Automatic computation of score differences (home performance - facility baseline)
- **Insights Generation**: Summary statistics including strongest areas, weakest areas, and overall progress trends

---

## 🎓 Purpose & Benefits

### Clinical Value
1. **Validation of At-Home Practice**: Confirms whether patients are practicing correctly outside clinical settings
2. **Progress Tracking**: Quantifies improvement or regression across therapy domains
3. **Treatment Adjustment**: Helps therapists identify which areas need more focus or different approaches
4. **Outcome Measurement**: Provides objective data for treatment effectiveness and insurance documentation

### Patient Benefits
1. **Motivation**: Visual feedback on progress encourages continued practice
2. **Self-Awareness**: Helps patients understand their strengths and areas needing improvement
3. **Transparency**: Builds trust by showing how at-home work translates to clinical outcomes
4. **Goal Setting**: Clear metrics help patients set and achieve realistic therapy goals

### System Benefits
- **Data-Driven Decisions**: Replaces subjective assessments with objective metrics
- **Early Intervention**: Identifies declining performance before it becomes critical
- **Resource Optimization**: Helps allocate therapy time to areas with greatest need
- **Accountability**: Creates a feedback loop between clinical and home-based care

---

## 👥 User Roles & Access

### Therapist Access
- **Full Access**: Can view and manage all diagnostic comparisons for their patients
- **Create Diagnostics**: Can create and edit facility-based baseline assessments
- **Historical View**: Access complete diagnostic history with trend analysis
- **API Endpoints**: 
  - `POST /api/therapist/diagnostics` - Create facility diagnostic
  - `GET /api/therapist/diagnostics/<user_id>/comparison` - Get comparison data
  - `GET /api/therapist/diagnostics/<user_id>/comparison-history` - Get historical data

### Patient Access
- **Read-Only Access**: Patients can view their own comparison data
- **No Editing**: Cannot modify facility diagnostic scores (clinical data integrity)
- **Current Status Only**: Primarily see latest comparison, limited historical access
- **API Endpoints**:
  - `GET /api/diagnostic-comparison` - Get own comparison data

---

## 📖 Usage Instructions

### For Therapists

#### 1. Creating a Facility Diagnostic Assessment

**Location**: Therapist Dashboard → "Diagnostic Comparison" Tab

**Steps**:
1. Navigate to the Therapist Dashboard
2. Click on the **"Diagnostic Comparison"** tab
3. Search for a patient using the patient search bar
4. Click **"Create New Diagnostic"** button
5. Fill in the assessment form:
   - **Assessment Date**: Date the assessment was conducted
   - **Assessment Type**: Initial, Progress Check, or Final
   - **Severity Level**: Overall severity classification
   - **Therapy Scores**:
     - **Articulation**: Individual sound scores (0-100) for sounds like /k/, /r/, /s/, etc.
     - **Fluency**: Overall fluency score (0-100)
     - **Receptive Language**: Comprehension score (0-100)
     - **Expressive Language**: Expression score (0-100)
     - **Gait Metrics**: Stability, symmetry, step regularity scores
   - **Notes**: Clinical observations and context
   - **Recommended Focus**: Areas requiring priority attention

6. Click **"Save Diagnostic"**

**Validation**:
- All scores must be between 0-100
- At least assessment_date and user_id are required
- System validates patient exists before saving

#### 2. Viewing Comparison Results

**After Creating or Selecting a Diagnostic**:

The comparison view displays:

**Header Information**:
- Patient name
- Assessment date
- Assessor name
- Severity level
- Clinical notes

**Score Comparison Table**:
| Therapy Area | Facility Score | Current At-Home Score | Delta |
|-------------|----------------|----------------------|-------|
| Articulation (/k/) | 45% | 62% | ▲ +17% |
| Fluency | 60% | 58% | ▼ -2% |
| Receptive | 70% | 85% | ▲ +15% |
| ... | ... | ... | ... |

**Delta Interpretation**:
- **Green ▲ +X%**: Improvement over baseline (positive delta)
- **Red ▼ -X%**: Decline from baseline (negative delta)  
- **Gray — 0%**: Stable, no change
- **N/A**: Missing data (either facility or home data not available)

**Summary Insights Panel**:
```
Overall Average Delta: +8.5%
Strongest Area: /s/ Sound (+22%)
Weakest Area: Fluency (-2%)
Improving: 8 metrics
Declining: 2 metrics
Stable: 1 metric
```

#### 3. Viewing Historical Trends

The comparison history chart shows all facility diagnostics over time, allowing you to:
- Track score evolution across multiple assessments
- Identify intervention points and their effectiveness
- Compare different assessment periods

**Chart Features**:
- Line graph with date on X-axis and scores on Y-axis
- Different colors for each therapy domain
- Hover for exact scores and dates
- Toggle metrics on/off for clearer visualization

#### 4. Selecting Specific Diagnostics

If a patient has multiple facility diagnostics:
1. Use the diagnostic selector dropdown
2. Select a specific assessment by date
3. The comparison will update to show baseline from that specific assessment
4. URL parameter: `?diagnostic_id=<id>` can be used for direct links

---

### For Patients

#### Viewing Your Comparison (Health Logs Page)

**Location**: Health Logs → "Facility Comparison" Section

**What You'll See**:

**1. Comparison Cards** - One card per therapy area showing:
- **Facility Score**: Your baseline from the last clinical assessment
- **Current Score**: Your latest at-home practice performance
- **Delta Badge**: Visual indicator of progress
  - 🎉 **Great Progress!** (≥20% improvement)
  - 📈 **Improving** (5-19% improvement)
  - ➡️ **Stable** (-3% to +4%)
  - 💪 **Keep Practicing** (-10% to -4%)
  - ⚠️ **Needs Focus** (<-10%)

**2. Score Band Labels**:
- **Mastered**: 86-100%
- **Functional**: 71-85%
- **Mild**: 51-70%
- **Moderate**: 31-50%
- **Severe**: 0-30%

**Example Display**:
```
┌─────────────────────────────────────┐
│ Articulation (/k/ Sound)            │
├─────────────────────────────────────┤
│ Facility: 45% (Moderate)            │
│ Current:  62% (Mild)                │
│ Change:   ▲ +17%                    │
│                                     │
│ 📈 Improving                        │
└─────────────────────────────────────┘
```

**Interpretation Tips**:
- Focus on areas marked "⚠️ Needs Focus" in your practice sessions
- Celebrate "🎉 Great Progress!" areas but maintain consistency
- For "➡️ Stable" areas, consider increasing practice frequency or difficulty

---

## 🔄 Data Flow & Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                            │
│  (Therapist Dashboard or Patient Health Logs)                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API ENDPOINT                          │
│  /api/therapist/diagnostics/<user_id>/comparison                │
│  /api/diagnostic-comparison (patient endpoint)                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA RETRIEVAL PHASE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Fetch Facility Diagnostic (Baseline)                        │
│     ├─ Source: facility_diagnostics collection                  │
│     ├─ Query: Latest or specific diagnostic_id                  │
│     └─ Fields: All baseline scores, notes, metadata             │
│                                                                  │
│  2. Aggregate At-Home Scores (Current Performance)              │
│     ├─ Articulation: articulation_progress collection           │
│     │   └─ Compute: overall_mastery per sound * 100             │
│     ├─ Fluency: fluency_progress collection                     │
│     │   └─ Compute: overall_mastery * 100                       │
│     ├─ Receptive: language_progress (mode='receptive')          │
│     │   └─ Compute: accuracy * 100                              │
│     ├─ Expressive: language_progress (mode='expressive')        │
│     │   └─ Compute: accuracy * 100                              │
│     └─ Gait: gaitprogresses collection                          │
│         └─ Compute: Average of stability, symmetry, regularity  │
│                                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   COMPUTATION PHASE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Delta Calculation                                            │
│     └─ Formula: home_score - facility_score                     │
│     └─ Applied to all matching metrics                          │
│                                                                  │
│  2. Summary Insights Generation                                  │
│     ├─ Overall Average Delta: mean(all_deltas)                  │
│     ├─ Strongest Area: max(deltas)                              │
│     ├─ Weakest Area: min(deltas)                                │
│     ├─ Improving Count: count(deltas > 0)                       │
│     ├─ Declining Count: count(deltas < 0)                       │
│     └─ Stable Count: count(deltas == 0)                         │
│                                                                  │
│  3. Metadata Enrichment                                          │
│     ├─ Look up assessor information                             │
│     ├─ Format dates for display                                 │
│     └─ Add patient context                                      │
│                                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE FORMATION                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JSON RESPONSE                                 │
├─────────────────────────────────────────────────────────────────┤
│ {                                                                │
│   success: true,                                                 │
│   has_facility_data: true,                                       │
│   patient_name: "John Doe",                                      │
│   assessment_date: "2026-01-15T10:30:00Z",                       │
│   facility_scores: {...},                                        │
│   home_scores: {...},                                            │
│   deltas: {...},                                                 │
│   summary_insights: {...}                                        │
│ }                                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT RENDERING                              │
│  (Tables, Charts, Cards, Badges)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Collections Used

1. **facility_diagnostics**
   - Stores clinical baseline assessments
   - Created by therapists via web interface
   - Fields: user_id, assessment_date, scores, notes, metadata

2. **articulation_progress**
   - Tracks at-home articulation practice
   - Per-sound mastery levels
   - Updated after each articulation exercise session

3. **fluency_progress**
   - Tracks fluency therapy performance
   - Overall mastery metric
   - Updated from fluency exercises

4. **language_progress**
   - Tracks receptive and expressive language
   - Separate documents for each mode
   - Accuracy-based scoring

5. **gaitprogresses**
   - Stores gait analysis from wearable sensors
   - Multiple metrics: stability, symmetry, regularity
   - Averaged across all sessions for comparison

---

## 📊 Metrics Compared

### Articulation (Per-Sound Granularity)

**Facility Side**: Individual sound scores entered by therapist (0-100)
- Examples: /k/, /r/, /s/, /l/, /sh/, /ch/, /th/

**At-Home Side**: Mastery level from articulation_progress
- Calculation: `overall_mastery * 100` (if ≤1) or `overall_mastery` (if >1)
- Based on: Exercise completion, accuracy, consistency

**Delta**: home_score - facility_score per sound

---

### Fluency

**Facility Side**: Single fluency score (0-100)

**At-Home Side**: Overall fluency mastery
- Calculation: `overall_mastery * 100`
- Based on: Fluency exercise performance metrics

**Delta**: home_fluency - facility_fluency

---

### Receptive Language

**Facility Side**: Receptive comprehension score (0-100)

**At-Home Side**: Accuracy from receptive language exercises
- Calculation: `accuracy * 100`
- Based on: Correctness of responses in receptive tasks

**Delta**: home_receptive - facility_receptive

---

### Expressive Language

**Facility Side**: Expressive language score (0-100)

**At-Home Side**: Accuracy from expressive language exercises
- Calculation: `accuracy * 100`
- Based on: Quality of expressive language outputs

**Delta**: home_expressive - facility_expressive

---

### Gait (Physical Mobility)

**Facility Side**: Individual gait metrics (0-100)
- Stability score
- Gait symmetry
- Step regularity
- Overall gait score

**At-Home Side**: Averaged metrics from wearable sensor data
- Calculation: Mean of all gait session metrics * 100
- Based on: Accelerometer and gyroscope analysis

**Delta**: home_gait_overall - facility_gait_overall

---

## 📈 Understanding the Comparison Output

### Response Structure

```json
{
  "success": true,
  "has_facility_data": true,
  "patient_name": "John Doe",
  "assessment_date": "2026-01-15T10:30:00Z",
  "assessment_type": "initial",
  "assessor_name": "Dr. Sarah Johnson",
  "severity_level": "Moderate",
  "notes": "Patient shows difficulty with velar sounds and fluency.",
  "recommended_focus": ["articulation", "fluency"],
  
  "facility_scores": {
    "articulation": {
      "k": 45,
      "r": 50,
      "s": 60
    },
    "fluency": 55,
    "receptive": 70,
    "expressive": 65,
    "gait": {
      "stability_score": 75,
      "gait_symmetry": 72,
      "step_regularity": 70,
      "overall_gait": 72.3
    }
  },
  
  "home_scores": {
    "articulation": {
      "k": 62,
      "r": 68,
      "s": 82
    },
    "fluency": 58,
    "receptive": 85,
    "expressive": 78,
    "gait": {
      "stability_score": 80,
      "gait_symmetry": 78,
      "step_regularity": 76,
      "overall_gait": 78
    }
  },
  
  "deltas": {
    "articulation": {
      "k": 17,
      "r": 18,
      "s": 22
    },
    "fluency": 3,
    "receptive": 15,
    "expressive": 13,
    "gait": 5.7
  },
  
  "summary_insights": {
    "overall_avg_delta": 13.2,
    "strongest_area": {
      "metric": "/S/ Sound",
      "delta": 22
    },
    "weakest_area": {
      "metric": "Fluency",
      "delta": 3
    },
    "total_metrics": 8,
    "improving_count": 8,
    "declining_count": 0,
    "stable_count": 0
  }
}
```

### Key Insights Interpretation

#### Overall Average Delta
- **Meaning**: Average improvement/decline across all measured metrics
- **Positive Value**: Overall improvement since baseline
- **Negative Value**: Overall decline since baseline
- **Calculation**: `sum(all_deltas) / count(all_deltas)`

#### Strongest Area
- **Meaning**: Metric with greatest improvement
- **Use Case**: Celebrate success, identify effective therapy approaches
- **Example**: "/S/ Sound with +22%" indicates excellent articulation progress

#### Weakest Area
- **Meaning**: Metric with least improvement or greatest decline
- **Use Case**: Prioritize therapy focus, adjust treatment plan
- **Example**: "Fluency with +3%" suggests need for more fluency practice

#### Metric Counts
- **Improving**: Metrics with positive deltas (getting better)
- **Declining**: Metrics with negative deltas (getting worse)
- **Stable**: Metrics with zero delta (no change)

---

## 🔌 API Endpoints

### 1. Create Facility Diagnostic (Therapist Only)

```http
POST /api/therapist/diagnostics
Authorization: Bearer <therapist_token>
Content-Type: application/json

{
  "user_id": "698828eee8b0c083907d6163",
  "assessment_date": "2026-01-15T10:30:00Z",
  "assessment_type": "initial",
  "articulation_scores": {
    "k": 45,
    "r": 50,
    "s": 60
  },
  "fluency_score": 55,
  "receptive_score": 70,
  "expressive_score": 65,
  "gait_scores": {
    "stability_score": 75,
    "gait_symmetry": 72,
    "step_regularity": 70
  },
  "notes": "Patient shows difficulty with velar sounds.",
  "severity_level": "Moderate",
  "recommended_focus": ["articulation", "fluency"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Facility diagnostic created successfully",
  "diagnostic_id": "507f1f77bcf86cd799439011"
}
```

---

### 2. Get Diagnostic Comparison (Therapist)

```http
GET /api/therapist/diagnostics/<user_id>/comparison
Authorization: Bearer <therapist_token>

Optional Query Parameters:
?diagnostic_id=507f1f77bcf86cd799439011
```

**Response**: See "Understanding the Comparison Output" section above

---

### 3. Get Comparison History (Therapist)

```http
GET /api/therapist/diagnostics/<user_id>/comparison-history
Authorization: Bearer <therapist_token>
```

**Response**:
```json
{
  "success": true,
  "patient_name": "John Doe",
  "total": 3,
  "history": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "assessment_date": "2026-01-15T10:30:00Z",
      "assessment_type": "initial",
      "severity_level": "Moderate",
      "articulation_scores": {...},
      "fluency_score": 55,
      "receptive_score": 70,
      "expressive_score": 65,
      "gait_scores": {...}
    },
    // ... more diagnostics
  ]
}
```

---

### 4. Get Own Comparison (Patient)

```http
GET /api/diagnostic-comparison
Authorization: Bearer <patient_token>

Optional Query Parameters:
?diagnostic_id=507f1f77bcf86cd799439011
```

**Response**: Same structure as therapist comparison, but only for authenticated patient

---

### 5. Get All Diagnostics for Patient (Therapist)

```http
GET /api/therapist/diagnostics/<user_id>
Authorization: Bearer <therapist_token>
```

**Response**:
```json
{
  "success": true,
  "patient_name": "John Doe",
  "diagnostics": [/* array of diagnostic objects */],
  "total": 3
}
```

---

## 🛠️ Implementation Details

### Backend Technology Stack
- **Framework**: Flask (Python)
- **Database**: MongoDB
- **Authentication**: JWT tokens with role-based access control
- **Collections**: 
  - `facility_diagnostics`: Clinical assessments
  - `articulation_progress`: At-home articulation data
  - `fluency_progress`: At-home fluency data
  - `language_progress`: At-home language data
  - `gaitprogresses`: At-home gait data

### Frontend Technology Stack
- **Framework**: React
- **State Management**: React hooks (useState, useEffect)
- **API Client**: Axios
- **Routing**: React Router
- **Styling**: CSS modules

### Key Functions

#### Backend (`app.py`)

```python
@app.route('/api/therapist/diagnostics/<user_id>/comparison', methods=['GET'])
@token_required
@therapist_required
def get_diagnostic_comparison(current_user, user_id):
    # 1. Fetch facility diagnostic (baseline)
    # 2. Aggregate at-home scores from multiple collections
    # 3. Compute deltas (home - facility)
    # 4. Generate summary insights
    # 5. Return comprehensive comparison object
```

**Aggregation Logic**:
- Articulation: Query `articulation_progress`, extract `overall_mastery` per sound
- Fluency: Query `fluency_progress`, extract `overall_mastery`
- Language: Query `language_progress` with mode filter, extract `accuracy`
- Gait: Query `gaitprogresses`, compute averages across sessions

**Delta Calculation**:
```python
delta = home_score - facility_score
```

**Rounding**: All scores rounded to 1 decimal place for consistency

#### Frontend (`TherapistDashboard.jsx`, `HealthLogs.jsx`)

**Therapist Dashboard**:
```javascript
const loadDiagComparison = async (userId, diagnosticId = null) => {
  // Parallel fetch: comparison, diagnostics list, history
  const [comparisonRes, diagnosticsRes, historyRes] = await Promise.all([
    diagnosticComparisonService.getComparison(userId, diagnosticId),
    diagnosticComparisonService.getDiagnostics(userId),
    diagnosticComparisonService.getComparisonHistory(userId)
  ]);
  // Update state for rendering
};
```

**Patient Health Logs**:
```javascript
const fetchFacilityComparison = async () => {
  const data = await diagnosticComparisonService.getMyComparison();
  // Display in comparison cards with delta badges
};
```

### Security & Authorization
- **Therapists**: Full CRUD access to all patient diagnostics
- **Patients**: Read-only access to own data
- **Token Validation**: All endpoints require valid JWT token
- **Role Checking**: `@therapist_required` decorator enforces role
- **Patient Isolation**: Patient endpoint filters by authenticated user ID

---

## 📝 Notes & Considerations

### Known Limitations

1. **Missing Data Scenarios**
   - If no facility diagnostic exists, comparison returns `has_facility_data: false`
   - If at-home progress is missing for a metric, delta is `null`
   - Partial data is handled gracefully with N/A indicators in UI

2. **Score Normalization**
   - Facility scores are 0-100 scale
   - At-home scores are converted to 0-100 (some stored as 0-1 decimals)
   - Inconsistent storage formats are normalized during comparison

3. **Historical Data**
   - Only facility diagnostics are versioned
   - At-home data always reflects current/latest performance
   - Historical at-home data not preserved for past comparisons

4. **Gait Averaging**
   - All gait sessions averaged equally (no time-weighted averaging)
   - Outlier sessions can skew results
   - No filtering for invalid or test sessions

5. **Articulation Sound Mismatch**
   - If facility assessment includes sounds not practiced at home, delta is null
   - If home practice includes sounds not in facility assessment, they're not shown
   - Only overlapping sounds are compared

### Edge Cases

**1. No At-Home Practice**
```json
{
  "has_facility_data": true,
  "home_scores": {
    "articulation": {},
    "fluency": null,
    "receptive": null,
    ...
  },
  "deltas": {
    "articulation": {},
    "fluency": null,
    ...
  }
}
```
**UI Handling**: Shows "No practice data yet" messages

**2. Multiple Facility Diagnostics**
- Default: Latest diagnostic by `assessment_date`
- Override: Specify `diagnostic_id` query parameter
- UI: Dropdown selector to switch between assessments

**3. Very High/Low Deltas**
- No upper/lower bounds enforced on deltas
- Delta of +100 possible if facility=0, home=100
- UI: Visual clamping or special indicators for extreme values

**4. Date Formatting**
- Backend: ISO 8601 strings with timezone
- Frontend: Locale-specific display formatting
- Timezone handling: UTC stored, local display

### Performance Considerations

**Database Queries**:
- Single query for facility diagnostic (indexed by user_id, assessment_date)
- Multiple queries for at-home data (one per therapy type)
- No joins required (NoSQL architecture)

**Optimization Opportunities**:
- Cache at-home aggregations if data doesn't change frequently
- Batch-process deltas and insights on diagnostic creation
- Pre-compute summary statistics for faster retrieval

**Scalability**:
- Current implementation: O(n) for n gait records averaging
- Recommended: Implement rolling averages or time windows
- Consider pagination for comparison history with many diagnostics

### Future Enhancements

1. **Time-Based Filtering**
   - Compare facility diagnostic with at-home data from same time period
   - Weighted averaging prioritizing recent sessions

2. **Confidence Intervals**
   - Statistical significance of deltas
   - Sample size indicators (e.g., "Based on 15 sessions")

3. **Goal Setting Integration**
   - Set target deltas per metric
   - Progress bars toward goals
   - Notifications when goals achieved

4. **Automated Insights**
   - ML-based recommendations
   - Anomaly detection (unusual declines)
   - Predictive modeling for future progress

5. **Export Functionality**
   - PDF reports for insurance
   - CSV exports for external analysis
   - Shareable links for family/caregivers

6. **Granular Filtering**
   - Filter at-home data by date range
   - Exclude outlier sessions
   - Focus on specific exercise types

### Troubleshooting

**Issue**: Comparison shows all null deltas despite at-home practice
- **Cause**: User ID mismatch between facility diagnostic and progress collections
- **Solution**: Verify `user_id` field consistency across collections

**Issue**: Gait scores drastically different from expected
- **Cause**: Sensor calibration issues or test data not filtered
- **Solution**: Review `gaitprogresses` collection for anomalies

**Issue**: Articulation sounds missing in comparison
- **Cause**: Sound ID naming mismatch (e.g., "k" vs "/k/" vs "K")
- **Solution**: Standardize sound identifiers across system

**Issue**: Historical chart not loading
- **Cause**: Large number of diagnostics causing timeout
- **Solution**: Implement pagination or limit to recent N diagnostics

### Developer Notes

**Adding New Therapy Types**:
1. Create new progress collection (e.g., `new_therapy_progress`)
2. Add aggregation logic in `get_diagnostic_comparison()` function
3. Include in facility diagnostic schema
4. Update frontend comparison display components
5. Add to delta calculation and summary insights

**Modifying Score Calculation**:
- Update normalization logic in aggregation phase
- Ensure 0-100 scale consistency
- Update tests to reflect new calculation

**Testing Checklist**:
- ✅ Facility diagnostic creation with all fields
- ✅ Facility diagnostic creation with partial fields
- ✅ Comparison with no at-home data
- ✅ Comparison with no facility data
- ✅ Comparison with partial overlapping data
- ✅ Historical trending with multiple diagnostics
- ✅ Patient read-only access verification
- ✅ Therapist multi-patient access

---

## 🚀 Quick Start Example

### Complete Workflow

**Step 1: Therapist Creates Baseline**
```bash
# Login as therapist
POST /api/login
{
  "email": "therapist@example.com",
  "password": "password"
}
# Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Create diagnostic
POST /api/therapist/diagnostics
{
  "user_id": "698828eee8b0c083907d6163",
  "assessment_date": "2026-02-08T10:00:00Z",
  "articulation_scores": {"k": 40, "r": 45},
  "fluency_score": 50,
  ...
}
```

**Step 2: Patient Practices at Home**
```bash
# Patient completes therapy sessions
# Progress automatically recorded in:
# - articulation_progress
# - fluency_progress
# - language_progress
# - gaitprogresses
```

**Step 3: View Comparison**
```bash
# Therapist views comparison
GET /api/therapist/diagnostics/698828eee8b0c083907d6163/comparison

# Patient views own comparison
GET /api/diagnostic-comparison
```

**Step 4: Interpret Results**
```
Articulation /k/: 40% → 62% (Δ +22%) 🎉 Great Progress!
Fluency: 50% → 58% (Δ +8%) 📈 Improving
...
```

---

## 📞 Support & Feedback

For questions, issues, or feature requests related to the Diagnostic Comparison feature:

- **Documentation**: This README
- **Code**: `backend/app.py` (lines 4269-4800)
- **Frontend**: 
  - Therapist: `frontend/src/pages/TherapistDashboard.jsx`
  - Patient: `frontend/src/pages/HealthLogs.jsx`
- **API Service**: `frontend/src/services/api.js` (diagnosticComparisonService)

---

**Last Updated**: February 8, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
