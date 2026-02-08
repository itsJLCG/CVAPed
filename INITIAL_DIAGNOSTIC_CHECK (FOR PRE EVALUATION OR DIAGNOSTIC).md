# Initial Diagnostic Check Feature

## Overview

The Initial Diagnostic Check is a feature that asks users whether they have already had an initial diagnostic assessment or have visited the CVAPed facility. Based on their response, the system tailors their experience with appropriate guidance and workflow optimizations.

---

## User Flow

```
Login / Register
       │
       ▼
Therapy Selection Page (/therapy-selection)
       │
       ├── hasInitialDiagnostic is null/undefined
       │       │
       │       ▼
       │   Modal appears: "Have you had an initial diagnostic?"
       │       │
       │       ├── User clicks "Yes, I Have"
       │       │       │
       │       │       ▼
       │       │   Response saved → Auto-navigate to therapy page
       │       │   (if therapyType exists on profile)
       │       │
       │       ├── User clicks "No, Not Yet"
       │       │       │
       │       │       ▼
       │       │   Response saved → Info banner appears with
       │       │   "Book Your Initial Assessment" button
       │       │
       │       └── User dismisses modal (X / Escape / overlay click)
       │               │
       │               ▼
       │           Nothing saved → Modal reappears on next visit
       │
       ├── hasInitialDiagnostic === true (returning user)
       │       │
       │       ▼
       │   Auto-navigate to their therapy page
       │   (skips selection screen)
       │
       └── hasInitialDiagnostic === false (returning user)
               │
               ▼
           Info banner shown with "Book Your Initial Assessment"
           (dismissible, reappears on next visit)
```

---

## Files Modified / Created

### Frontend

| File | Change |
|------|--------|
| `src/components/InitialDiagnosticModal.jsx` | **New** — Modal component with Yes/No buttons |
| `src/components/InitialDiagnosticModal.css` | **New** — Modal styling (matches TermsAndConditionsModal pattern) |
| `src/pages/TherapySelection.jsx` | **Modified** — Modal integration, banner, auto-navigate logic |
| `src/pages/TherapySelection.css` | **Modified** — Banner styling added |
| `src/services/api.js` | **Modified** — Added `authService.updateDiagnosticStatus()` method |

### Backend

| File | Change |
|------|--------|
| `backend/app.py` | **Modified** — New `PUT /api/user/diagnostic-status` endpoint; `hasInitialDiagnostic` added to login, Firebase auth, and complete-profile responses |

---

## Components

### InitialDiagnosticModal

A reusable modal component following the same pattern as `TermsAndConditionsModal`.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls modal visibility |
| `onClose` | `function` | Called when modal is dismissed without answering |
| `onConfirm` | `function(boolean)` | Called with `true` (Yes) or `false` (No) |
| `loading` | `boolean` | Disables buttons and shows "Saving..." text |

**Behavior:**
- Escape key closes the modal
- Clicking the overlay closes the modal
- Body scroll is locked while modal is open
- Clicking inside the modal content does not close it (`stopPropagation`)

### Guidance Banner

A dismissible info banner rendered conditionally in `TherapySelection.jsx` for users who answered "No".

**Features:**
- Blue-themed informational design
- Dismiss button (×) to hide for current session
- "Book Your Initial Assessment" button navigates to `/appointments`
- Reappears on each visit to `/therapy-selection` (since the user still hasn't been assessed)
- Slides in with a CSS animation

---

## API

### `PUT /api/user/diagnostic-status`

Updates the user's initial diagnostic status.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "hasInitialDiagnostic": true | false
}
```

**Success Response (200):**
```json
{
  "message": "Diagnostic status updated successfully",
  "user": {
    "id": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "role": "patient",
    "therapyType": "speech",
    "patientType": "child",
    "hasInitialDiagnostic": true,
    "diagnosticStatusUpdatedAt": "2026-02-07 12:00:00"
  }
}
```

**Error Response (400):**
```json
{
  "message": "hasInitialDiagnostic is required"
}
```

### Frontend API Method

```javascript
authService.updateDiagnosticStatus(hasInitialDiagnostic: boolean): Promise
```

Calls `PUT /api/user/diagnostic-status` and updates `localStorage` with the returned user object.

---

## Database Schema

The following fields are added to the `users` collection in MongoDB:

| Field | Type | Description |
|-------|------|-------------|
| `hasInitialDiagnostic` | `Boolean` | `true` if user has had an assessment, `false` if not, absent if never asked |
| `diagnosticStatusUpdatedAt` | `DateTime` | Timestamp of when the user answered the question |

---

## Behavior Summary

| User Response | Immediate Action | On Return Visit |
|---------------|-----------------|-----------------|
| **Yes** | Toast confirmation → auto-navigate to their therapy page | Auto-navigates directly (skips selection) |
| **No** | Toast recommendation → info banner with booking CTA | Banner reappears each visit |
| **Dismissed** | Nothing saved | Modal reappears |
| **Never asked** | Modal shown | Modal shown |

---

## Design Decisions

1. **Modal placement:** Shows on `TherapySelection` (not during registration) to avoid disrupting the sign-up flow.

2. **Auto-navigate for "Yes" users:** Users who already have a diagnosis and a therapy type set during registration don't need to choose again — they go straight to their therapy section.

3. **Banner persistence:** The banner reappears on each visit for "No" users because the underlying condition (no assessment) hasn't changed. It's dismissible per session to avoid being intrusive.

4. **`null` vs `undefined` handling:** The backend returns `null` (Python `None`) for unset fields. The frontend check uses `== null` (loose equality) to catch both `null` and `undefined`.

5. **No blocking:** Users who answered "No" can still freely use all therapy features. The banner is informational, not restrictive.
