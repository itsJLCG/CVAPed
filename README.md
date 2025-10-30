# CVACare - Physical & Speech Therapy Management System

A comprehensive therapy management system combining physical therapy for stroke patients and speech therapy for pediatric patients.

## Project Structure

```
CVACare_Thesis/
├── frontend/          # React Vite application
│   ├── src/
│   │   ├── pages/    # Login, Register, Dashboard
│   │   ├── services/ # API integration
│   │   └── ...
│   └── package.json
│
└── backend/           # Python Flask API
    ├── app.py        # Main application
    ├── requirements.txt
    └── README.md
```

## Quick Start

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Setup environment variables:
```bash
copy .env.example .env
```
Edit `.env` file with your configuration.

5. Run the server:
```bash
python app.py
```

Backend runs on http://localhost:5000

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend runs on http://localhost:3000

## Features

- ✅ User Registration & Login
- ✅ JWT Authentication
- ✅ MongoDB Database Integration
- ✅ Responsive Design
- ✅ Default User Role Assignment
- 🎨 Custom Color Scheme (White, #ce3630, #479ac3, #e8b04e)

## Technologies

**Frontend:**
- React 18
- Vite
- React Router DOM
- Axios

**Backend:**
- Python Flask
- MongoDB (PyMongo)
- JWT Authentication
- Flask-CORS
- Bcrypt
- Environment Variables (python-dotenv)

## Database

MongoDB Atlas connection is pre-configured. Users are stored with:
- Email
- Password (hashed)
- First Name & Last Name
- Role (default: "user")
- Timestamps

## Color Palette

- Primary: `#ce3630` (Red)
- Secondary: `#479ac3` (Blue)
- Accent: `#e8b04e` (Gold)
- Base: `#ffffff` (White)

## Security Notes

- All sensitive configuration is stored in `.env` file
- Never commit `.env` to version control
- Change `SECRET_KEY` in production
- Use strong passwords for database connections
- Keep dependencies updated
