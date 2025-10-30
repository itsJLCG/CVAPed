# CVACare Backend

Python Flask backend for CVACare - Physical and Speech Therapy Management System

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file from the example:
```bash
copy .env.example .env
```

5. Configure your environment variables in `.env`:
   - `SECRET_KEY`: Your application secret key (change this in production!)
   - `MONGO_URI`: Your MongoDB connection string
   - `PORT`: Port number for the application (default: 5000)
   - `FLASK_DEBUG`: Set to `True` for development, `False` for production

6. Run the application:
```bash
python app.py
```

The server will start on http://localhost:5000

## Environment Variables

The application uses the following environment variables (configured in `.env`):

- `SECRET_KEY` - Secret key for JWT token generation and session security
- `MONGO_URI` - MongoDB connection string
- `PORT` - Port number for the Flask application (default: 5000)
- `FLASK_DEBUG` - Enable/disable debug mode (True/False)

**Important:** Never commit your `.env` file to version control. Use `.env.example` as a template.

## API Endpoints

- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `GET /api/user` - Get current user (requires token)
- `GET /api/health` - Health check

## User Roles

- `user` - Default role assigned to all new registrations
- `admin` - System administrators (to be assigned manually in database)
