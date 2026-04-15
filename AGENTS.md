# CVAPed Web - Agent Guidelines

Healthcare application (CVA patient rehabilitation) with a React frontend and Python Flask backend.

## Project Structure

```
CVAPed Web/
├── frontend/          # React 18 + Vite (port 3000, plain JS/JSX - no TypeScript)
└── backend/           # Python Flask API + ML services (port 5000)
```

> Note: `mobile-guide/` is referenced in legacy docs but does NOT exist in this repo.

---

## Build & Development Commands

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev        # Dev server on port 3000
npm run build      # Production build → dist/
npm run lint       # ESLint across all .js/.jsx files
npm run preview    # Preview production build
```

### Python Backend (Flask + ML)
```bash
cd backend
source venv/Scripts/activate   # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python app.py                  # Starts Flask on port 5000
```

### Running a Single ESLint Check
```bash
cd frontend && npx eslint src/components/Header.jsx
```

### Testing
No test framework is currently configured. To add Vitest:
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
npx vitest run src/components/MyComponent.test.jsx   # Run single test
npx vitest run                                        # Run all tests
```
Python backend tests (if added): `pytest backend/tests/test_auth.py` (single) or `pytest backend/` (all).

---

## Linting

ESLint is configured via `frontend/.eslintrc.json`. Active rules:
- Extends: `eslint:recommended`, `plugin:react/recommended`, `plugin:react/jsx-runtime`, `plugin:react-hooks/recommended`, `plugin:jsx-a11y/recommended`
- **Disabled**: `react/prop-types`, `no-unused-vars`, `react/no-unescaped-entities`, `no-undef`, `no-console`, `react-hooks/exhaustive-deps`

---

## Environment Variables

```bash
# frontend/.env
VITE_API_URL=http://localhost:5000/api

# backend/.env
SECRET_KEY=your-jwt-secret
MONGO_URI=mongodb://localhost:27017/cvacare
PORT=5000
FIREBASE_SERVICE_ACCOUNT_PATH=./cvaped-firebase-adminsdk.json
```

---

## Code Style Guidelines

### General Principles
- No comments unless explaining non-obvious business logic
- Keep components small and focused (<300 lines); split if larger
- Prefer clarity over cleverness
- No inline styles — use co-located `.css` files per component (e.g., `Header.jsx` + `Header.css`)

### Imports — Frontend
Order: external libraries → internal services → local components → CSS
```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import Header from '../components/Header';
import './PageName.css';
```

### JavaScript Conventions
- `const` over `let`; never `var`
- Arrow functions for callbacks and event handlers
- Template literals over string concatenation
- Destructure objects/arrays when possible
- Optional chaining (`?.`) and nullish coalescing (`??`)
- Always `async/await` with `try/catch`; never raw `.then()/.catch()` chains

### Naming Conventions
- **React components**: PascalCase files and exports (`TherapyPage.jsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth`, `useFetchPatient`)
- **Event handlers**: `handle` prefix (`handleSubmit`, `handleLogout`)
- **Utility files**: kebab-case (`api-utils.js`, `audio-manager.js`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `API_TIMEOUT`)

### React Patterns
- Functional components with hooks only (class components only for `ErrorBoundary`)
- `useMemo` for expensive computations; `useCallback` for stable function refs passed as props
- Controlled form components; use `react-hook-form` for complex forms
- Route guards via `isAuthenticated` + `userRole` checks in `App.jsx`
- Context for cross-cutting concerns (Toast, VoiceSettings, TherapyCategory)

### React Component Template
```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { someService } from '../services/api';
import './ComponentName.css';

function ComponentName({ propA, onAction }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      const response = await someService.doSomething();
      onAction(response.data);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="component-name">
      <button onClick={handleAction} disabled={loading}>Submit</button>
    </div>
  );
}

export default ComponentName;
```

### API Service Pattern (frontend/src/services/api.js)
All services use a shared Axios instance with a Bearer token interceptor. Follow existing pattern:
```javascript
export const myService = {
  getAll: () => api.get('/my-resource'),
  getById: (id) => api.get(`/my-resource/${id}`),
  create: (data) => api.post('/my-resource', data),
  update: (id, data) => api.put(`/my-resource/${id}`, data),
  delete: (id) => api.delete(`/my-resource/${id}`),
};
```

### Python Flask Backend

- All routes use `@token_required` decorator for auth
- Consistent response format: `{ "success": True, "data": ... }` or `{ "error": "message" }`
- Use `ObjectId()` from `bson` for MongoDB IDs; convert to `str()` before returning
- Use `utc_now()` helper for timestamps
- Log errors with `logger.error(f'...: {e}')` — never expose raw exceptions to clients
- Blueprints for modular route organization

```python
@app.route('/api/resource', methods=['POST'])
@token_required
def create_resource(user_id):
    try:
        data = request.get_json()
        if not data.get('required_field'):
            return jsonify({'error': 'required_field is required'}), 400
        result = collection.insert_one({**data, 'user_id': ObjectId(user_id), 'created_at': utc_now()})
        return jsonify({'success': True, 'id': str(result.inserted_id)}), 201
    except Exception as e:
        logger.error(f'create_resource failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500
```

### Database (MongoDB via PyMongo)
- Use `ObjectId` from `bson`; convert to `str` in responses
- `.find_one()` for single docs; `.find()` with projections for lists
- Handle missing documents with 404 responses
- No Mongoose — this is PyMongo directly; no ORM schemas

### Security
- Never commit secrets or Firebase service account JSON files
- All sensitive routes protected by `@token_required`
- Validate and sanitize inputs before DB operations
- Role-based access: `patient`, `therapist`, `admin`
- Patient data isolation: always filter by `user_id`

---

## Key Dependencies

**Frontend:** React 18, React Router 6, React Hook Form, Axios, Firebase 12, Framer Motion, Wavesurfer.js 7, jsPDF, React Icons

**Backend:** Flask 3, PyMongo, PyJWT, Flask-CORS, Flask-Bcrypt, Flask-Limiter, Firebase Admin SDK, Librosa, XGBoost, Scikit-learn, Pandas, NumPy, Cloudinary

---

## Common Tasks

**Add a React page:** Create `frontend/src/pages/MyPage.jsx` + `MyPage.css`, add route in `App.jsx`, add nav link in `Header.jsx` if needed.

**Add a Flask endpoint:** Add route in `backend/app.py` (or a blueprint module), protect with `@token_required`, add corresponding service method in `frontend/src/services/api.js`.

**Add an ML predictor:** Follow patterns in `articulation_mastery_predictor.py` — load XGBoost model, expose via Flask route, integrate with frontend prediction service.

## Prohibited Practices
- Using `var` or class components (except `ErrorBoundary`)
- Hardcoding secrets, tokens, or MongoDB URIs
- Inline styles (use `.css` files)
- Exposing raw exception messages to API clients
- Components exceeding ~300 lines without splitting
- Using `console.log` for production logging (use `logger` in Python; `console.error` only for genuine errors in JS)
