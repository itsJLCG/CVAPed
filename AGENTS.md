# CVAPed Web - Agent Guidelines

Healthcare application with React frontend, Node.js backend, and Python ML services.

## Project Structure

```
CVAPed Web/
├── frontend/          # React + Vite web app (port 3000)
├── backend/           # Python Flask API (ML services)
└── mobile-guide/      # Optional: React Native + Express (separate module)
```

## Build & Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev       # Start dev server (port 3000)
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

### Python Backend (ML Services)
```bash
cd backend
source venv/Scripts/activate  # Windows
# source venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
python app.py
```

### Mobile Guide (Optional)
```bash
cd mobile-guide/backend && npm install && npm run dev
cd mobile-guide/frontend && npm install && npm start
```

---

## Code Style Guidelines

### General Principles
- **No comments** unless explaining complex business logic
- Use functional components with hooks in React
- Keep components small and focused (single responsibility)
- Use meaningful variable/function names

### Imports
- Use absolute imports when possible (via Vite/TypeScript paths)
- Order: external libraries → internal modules → local components
- Group React imports: `{ useState, useEffect } from 'react'`

### JavaScript Conventions
- Use `const` over `let`, avoid `var`
- Prefer arrow functions for callbacks
- Use template literals over string concatenation
- Destructure objects and arrays when possible
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Avoid inline styles; use CSS modules or Tailwind classes

### Naming Conventions
- **Components**: PascalCase (e.g., `PatientForm.jsx`)
- **Hooks**: camelCase starting with `use` (e.g., `useAuth`)
- **Functions**: camelCase (e.g., `handleSubmit`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Files**: kebab-case for non-components (e.g., `api-utils.js`)

### Error Handling
- Always wrap async operations in try/catch
- Use meaningful error messages for debugging
- Implement proper error boundaries in React
- Return appropriate HTTP status codes in API responses
- Never expose internal error details to clients

### React Patterns
- Use `useMemo` for expensive computations
- Use `useCallback` for function props passed to children
- Keep `useEffect` dependencies exhaustive
- Prefer controlled components over uncontrolled
- Extract reusable logic into custom hooks

### API Design (Node.js)
- Follow RESTful conventions
- Use middleware for cross-cutting concerns
- Validate all input with express-validator
- Return consistent response format
- Use async/await over callbacks

### Database (MongoDB)
- Use Mongoose schemas with proper validation
- Index frequently queried fields
- Use lean() for read-only queries
- Implement soft deletes where appropriate

### Security
- Never commit secrets to version control
- Use environment variables for configuration
- Sanitize user inputs to prevent injection
- Implement proper authentication/authorization

---

## Testing

No test framework configured. To add Vitest:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npx vitest run src/components/PatientForm.test.jsx  # Run single test
```

---

## Linting

ESLint is configured for the frontend. Run linting:
```bash
cd frontend && npm run lint
```

ESLint rules:
- React hooks exhaustive deps disabled
- PropTypes disabled
- No console warnings
- JSX runtime enabled

---

## Environment Variables

```bash
# frontend/.env
VITE_API_URL=http://localhost:5000

# mobile-guide/backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cvacare
JWT_SECRET=your-secret-key
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-key.json
```

---

## Key Dependencies

**Frontend:** React 18, React Router 6, React Hook Form, Axios, Firebase, Framer Motion, Wavesurfer.js

**Backend (Node.js):** Express, Mongoose, JWT, Express-validator, Multer, Firebase Admin, Cloudinary

**ML Backend (Python):** Flask, NumPy, Pandas, TensorFlow/PyTorch

---

## Common Tasks

**Adding API endpoint:** Create route in `routes/`, add validation middleware, register in `app.js`

**Adding React component:** Create in `components/`, use functional component with hooks, export as default
