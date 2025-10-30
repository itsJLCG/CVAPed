# CVACare Frontend

React Vite frontend for CVACare - Physical and Speech Therapy Management System

## Features

- Landing Page with animated elements
- User Registration and Login
- JWT Authentication
- Toast Notifications
- Responsive Design
- Color Scheme: White, #ce3630 (Primary), #479ac3 (Secondary), #e8b04e (Accent)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will start on http://localhost:3000

## Technologies

- React 18
- Vite
- React Router DOM
- Axios
- CSS3

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── pages/          # Page components (Landing, Login, Register, Dashboard)
├── components/     # Reusable components (Toast, etc.)
├── services/       # API service layer
├── assets/         # Images and static files
├── App.jsx         # Main app component
├── main.jsx        # Entry point
└── index.css       # Global styles
```

## Adding Images

Place your images in the `src/assets/` folder:
- Logo image
- CVACare text logo
- Web system screenshot
- CVACare_Android.jpg (mobile screenshot)
- Partner logos (TUP, I Love Taguig, Taguig Physical Rehabilitation Unit)
