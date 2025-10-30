# Setup Instructions for CVACare

## Step 1: Setup Backend (Python Flask)

1. Open a terminal and navigate to the backend folder:
```powershell
cd backend
```

2. Create a virtual environment:
```powershell
python -m venv venv
```

3. Activate the virtual environment:
```powershell
.\venv\Scripts\activate
```

4. Install required packages:
```powershell
pip install -r requirements.txt
```

5. Create your `.env` file:
```powershell
copy .env.example .env
```

6. **IMPORTANT:** Open the `.env` file and configure your settings:
   - Update `SECRET_KEY` with a secure random string for production
   - Update `MONGO_URI` with your MongoDB connection string (if different)
   - Set `FLASK_DEBUG=False` for production environments

7. Run the backend server:
```powershell
python app.py
```

The backend should now be running on http://localhost:5000

Keep this terminal open!

## Step 2: Setup Frontend (React Vite)

1. Open a NEW terminal and navigate to the frontend folder:
```powershell
cd frontend
```

2. Install Node.js dependencies:
```powershell
npm install
```

3. Start the development server:
```powershell
npm run dev
```

The frontend should now be running on http://localhost:3000

## Step 3: Test the Application

1. Open your browser and go to http://localhost:3000
2. You should see the Login page
3. Click "Register here" to create a new account
3. Fill in the registration form:
   - First Name
   - Last Name
   - Email
   - Password (minimum 6 characters)
   - Confirm Password
4. After successful registration, you'll be redirected to the Dashboard
5. All new users are automatically assigned the "user" role
6. You can logout and login again with your credentials

## Troubleshooting

### Backend Issues:
- Make sure Python is installed: `python --version`
- Make sure pip is updated: `python -m pip install --upgrade pip`
- Check if port 5000 is available

### Frontend Issues:
- Make sure Node.js is installed: `node --version`
- Clear npm cache if needed: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -r node_modules; npm install`

### Database Issues:
- The MongoDB connection is configured in the `.env` file
- Make sure you have internet connection (using MongoDB Atlas)
- Verify the MongoDB connection string in your `.env` file
- Check that your IP address is whitelisted in MongoDB Atlas

### Environment Variables:
- Make sure the `.env` file exists in the backend folder
- Verify all required variables are set in `.env`
- Never commit `.env` to version control (it's in .gitignore)

## Next Steps

After successful setup, you can:
1. Create multiple user accounts
2. Test login/logout functionality
3. All users are assigned "user" role by default
4. Admin roles can be assigned manually in the MongoDB database
5. Extend the application with more features like:
   - Patient profiles
   - Therapy sessions
   - Progress tracking
   - Appointment scheduling
   - Exercise libraries

## Important Notes

- Backend must be running before frontend for API calls to work
- Both servers must be running simultaneously
- The application uses JWT tokens for authentication
- Passwords are securely hashed using bcrypt
- MongoDB Atlas is used for cloud database storage





cd backend
.\venv\Scripts\activate
python app.py


cd frontend
npm run dev