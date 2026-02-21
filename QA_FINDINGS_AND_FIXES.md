# QA Analysis Report — CVAPed/CVACare
**Date:** February 21, 2026
**Analyst:** GitHub Copilot (Automated QA Audit)
**Scope:** Full backend (Python/Flask) and frontend (React/Vite) audit

---

## Executive Summary

The CVAPed codebase has **0 critical**, **1 remaining high-severity issue** (internal error details leaked), and 3 resolved high-severity issues (rate limiting, ErrorBoundary, useEffect memory leaks). The frontend has widespread accessibility gaps and relies heavily on native `alert()` calls instead of the already-installed toast library. The most critical security issues (JWT bypass, CORS, secret key, Firebase credentials) have been resolved.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | ✅ All Resolved |
| HIGH | 0 | ✅ All Resolved |
| MEDIUM | 10 | ❌ Unresolved |
| LOW | 5 | ❌ Unresolved |
| **Total** | **19** | |





## Medium Issues

### 9. Buttons Missing `aria-label` — Accessibility
- **Location:** Frontend-wide — 243 `<button>` elements, only 7 `aria-label` attributes
- **Description:** Icon-only buttons and buttons with non-descriptive text have no accessible label.
- **Impact:** Screen reader users cannot determine the purpose of most buttons.
- **Recommendation:** Add `aria-label="Descriptive action"` to all icon-only or ambiguous buttons.

### 10. Clickable `<div>` Elements Not Keyboard Accessible
- **Location:** `frontend/src/pages/LanguageTherapy.jsx` (3 instances), `TherapySelection.jsx`, `TherapistDashboard.jsx` (modal overlays) — ~45 total across frontend
- **Description:** `onClick` handlers are placed on `<div>`, `<span>`, and `<a>` elements that are not natively focusable or keyboard-operable.
- **Impact:** Keyboard-only users and screen reader users cannot interact with these elements.
- **Recommendation:** Replace with `<button>` elements, or add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler:
  ```jsx
  <div
    role="button"
    tabIndex={0}
    onClick={handleClick}
    onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  >
  ```

### 11. Only 1 Keyboard Event Handler in Entire Frontend
- **Location:** Frontend-wide
- **Description:** Only 1 `onKeyDown`/`onKeyPress`/`onKeyUp` handler exists across all frontend files, meaning nearly all interactive elements are mouse-only.
- **Impact:** Keyboard navigation is almost entirely broken for non-native interactive elements.
- **Recommendation:** Add keyboard handlers wherever click handlers exist on non-button/non-link elements.

### 12. Zero ARIA Live Regions
- **Location:** Frontend-wide — 0 instances of `aria-live`, `aria-expanded`, `aria-describedby`, `aria-labelledby`
- **Description:** Dynamic content updates (toasts, modals, loading states, form errors) are not announced to screen readers.
- **Impact:** Screen reader users receive no feedback for dynamic UI changes.
- **Recommendation:**
  - Add `aria-live="polite"` to toast/notification containers
  - Add `aria-expanded` to dropdowns and accordions
  - Add `aria-describedby` to form inputs with error messages
  - Add `aria-labelledby` to modal dialogs

### 13. Form Labels Not Associated with Inputs
- **Location:** Frontend-wide — 166 `<label>` elements, only 35 with `htmlFor`; 100 `<input>` elements
- **Description:** Most labels are not programmatically associated with their corresponding inputs via `htmlFor`/`id` pairs.
- **Impact:** Screen readers cannot associate labels with inputs; clicking a label does not focus the input.
- **Recommendation:** Ensure every `<label>` has `htmlFor` matching the `id` of its `<input>`:
  ```jsx
  <label htmlFor="email">Email</label>
  <input id="email" type="email" />
  ```

### 14. 73 Native `alert()` Calls Instead of Toast Notifications
- **Location:** `Appointments.jsx`, `ArticulationExercise.jsx`, `FluencyTherapy.jsx`, `TherapistDashboard.jsx`, `Profile.jsx` (and others)
- **Description:** Native browser `alert()` is used for user feedback throughout the app, despite react-toastify already being installed and used in 64 other places.
- **Impact:** Blocks the UI thread, cannot be styled, inaccessible, and provides a poor user experience.
- **Recommendation:** Replace all `alert("message")` with `toast.success("message")` / `toast.error("message")` from react-toastify.

### 15. 10+ Bare `except:` Clauses Silently Swallowing Errors
- **Location:**
  - `backend/app.py` — lines 1367, 2597, 2602, 3127
  - `backend/articulation_mastery_predictor.py` — lines 63, 384
  - `backend/fluency_mastery_predictor.py` — lines 58, 306
  - `backend/success_story_crud.py` — lines 249, 355, 398
  - `backend/create_test_data.py` — lines 387, 407
- **Description:** Bare `except:` catches all exceptions including `SystemExit`, `KeyboardInterrupt`, and `GeneratorExit`, and silently suppresses them.
- **Impact:** Critical errors are hidden; debugging becomes extremely difficult.
- **Recommendation:**
  ```python
  # Replace:
  except:
      pass

  # With:
  except Exception as e:
      logger.error(f"Error: {e}", exc_info=True)
  ```

### 16. `.map()` Calls Potentially Missing `key` Props
- **Location:** Frontend-wide — 123 `.map()` calls rendering JSX
- **Description:** Many `.map()` calls rendering lists of JSX elements may be missing stable `key` props on the root element.
- **Impact:** React cannot efficiently reconcile list updates, causing unnecessary re-renders and potential UI bugs.
- **Recommendation:** Ensure every `.map()` rendering JSX has a unique, stable `key` prop (prefer IDs over array indices).

### 17. Loading States Not Rendered in UI
- **Location:** Frontend-wide — 18 `useState(true)` loading states, only 4 render loading UI
- **Description:** Most components track a loading state but do not render any loading indicator while data is being fetched.
- **Impact:** Users see blank or partially rendered content during data fetches, with no feedback that something is loading.
- **Recommendation:** Add loading spinners or skeleton screens for all async data fetches:
  ```jsx
  if (loading) return <div className="loading-spinner">Loading...</div>;
  ```

### 18. Unresolved TODO Comments in Production Code
- **Location:**
  - `frontend/src/pages/FluencyTherapy.jsx:493` — `// TODO: Show final assessment results`
  - `frontend/src/pages/TherapistDashboard.jsx:1064`
- **Description:** TODO comments indicate incomplete features that were never implemented.
- **Impact:** The fluency therapy completion flow is incomplete — users finish a session but receive no final assessment results.
- **Recommendation:** Implement the missing functionality or create tracked issues for them.

---

## Low Issues

### 19. 600 `print()` Statements — No Structured Logging
- **Location:** All backend Python files
- **Description:** The entire backend uses `print()` for logging instead of Python's `logging` module.
- **Impact:** No log levels, no log formatting, no ability to route logs to files or monitoring systems. Debug output appears in production.
- **Recommendation:**
  ```python
  import logging
  logger = logging.getLogger(__name__)

  # Replace print() with:
  logger.debug("Debug info")
  logger.info("Info message")
  logger.error("Error occurred", exc_info=True)
  ```

### 20. 152 `console.log`/`console.error` Calls in Production Frontend
- **Location:** Frontend-wide — 66 `console.log`, 86 `console.error`
- **Description:** Debug logging is left in production code.
- **Impact:** Exposes internal application state and error details to anyone with browser DevTools open.
- **Recommendation:** Remove or gate behind environment check:
  ```js
  if (process.env.NODE_ENV === 'development') console.log(data);
  ```

### 21. 106 Inline `style=` Attributes
- **Location:** Frontend-wide
- **Description:** Styles are applied inline via `style={{}}` props throughout the frontend instead of CSS classes.
- **Impact:** Inconsistent styling, harder to maintain, cannot be overridden by themes or media queries.
- **Recommendation:** Move inline styles to CSS classes or CSS modules.

### 22. File Upload MIME Type Not Validated Server-Side
- **Location:** `backend/success_story_crud.py`
- **Description:** An `ALLOWED_MIMETYPES` set is defined but never used. Only file extension is validated via `allowed_file()`. A malicious user can rename a file to bypass extension checks.
- **Impact:** Potential upload of malicious files disguised with allowed extensions.
- **Recommendation:**
  ```python
  ALLOWED_MIMETYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}

  if file.content_type not in ALLOWED_MIMETYPES:
      return jsonify({"error": "Invalid file type"}), 400
  ```

### 23. Hardcoded Plaintext Password in Seed Script
- **Location:** `backend/create_test_data.py:18`
- **Description:** `"password": "password"` — a plaintext password is hardcoded in the test data creation script.
- **Impact:** Low risk if script is dev-only, but if accidentally run against production, creates accounts with known weak passwords.
- **Recommendation:** Use an environment variable or randomly generated password; add a guard to prevent running against production:
  ```python
  if os.getenv('FLASK_ENV') == 'production':
      raise RuntimeError("Do not run seed scripts in production!")
  ```

---

## Validated — No Action Needed

| Check | Result |
|-------|--------|
| All `<img>` elements have `alt=` attributes | ✅ 51/51 |
| No `dangerouslySetInnerHTML` usage | ✅ 0 instances |
| Passwords hashed with bcrypt | ✅ Confirmed |
| `.env` file excluded by `.gitignore` | ✅ Confirmed |
| `python-dotenv` properly used in backend | ✅ Confirmed |
| `/api/health` intentionally unprotected | ✅ Acceptable |
| No SQL injection risk (MongoDB used) | ✅ No raw SQL |
| JWT signature verification properly enforced | ✅ Fixed in `success_story_crud.py:96` |
| CORS restricted to allowed origins | ✅ Fixed in `app.py:46` |
| No hardcoded fallback JWT secret key | ✅ Fixed in `app.py:40-44` |
| Firebase Admin SDK JSON excluded by `.gitignore` | ✅ Fixed in `backend/.gitignore` |

---

## Fix Priority Order

1. 🔴 **[HIGH]** Stop leaking `str(e)` in error responses
2. 🟢 **[HIGH]** Add rate limiting to `/api/login` and `/api/register` — ✅ Done
3. 🟢 **[HIGH]** Add React `ErrorBoundary` — ✅ Done
4. 🟢 **[HIGH]** Fix `useEffect` cleanup functions — ✅ Done
5. 🟡 **[MEDIUM]** Replace 73 `alert()` calls with toast notifications
6. 🟡 **[MEDIUM]** Fix form label associations (`htmlFor`)
7. 🟡 **[MEDIUM]** Add `aria-label` to icon-only buttons
8. 🟡 **[MEDIUM]** Make clickable `<div>` elements keyboard accessible
9. 🟡 **[MEDIUM]** Add ARIA live regions for dynamic content
10. 🟡 **[MEDIUM]** Fix bare `except:` clauses
11. 🟡 **[MEDIUM]** Add loading UI for all async states
12. 🟡 **[MEDIUM]** Implement TODO items (FluencyTherapy assessment results)
13. 🟡 **[MEDIUM]** Audit `.map()` calls for missing `key` props
14. 🟢 **[LOW]** Replace `print()` with structured `logging`
15. 🟢 **[LOW]** Remove/gate `console.log` calls
16. 🟢 **[LOW]** Validate MIME types on file upload
17. 🟢 **[LOW]** Move inline styles to CSS classes
18. 🟢 **[LOW]** Add keyboard event handlers
19. 🟢 **[LOW]** Guard seed script against production use
