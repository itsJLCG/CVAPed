const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors());

// Connect to database and make it accessible
connectDB().then(db => {
  app.locals.db = db;
  console.log('✅ Database instance made available to routes');
});

// Route files (loaded after app is created)
const authRoutes = require('./routes/authRoutes');
const gaitRoutes = require('./routes/gaitRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const articulationAssessmentRoutes = require('./routes/articulationAssessment');
const articulationRoutes = require('./routes/articulationRoutes');
const fluencyAssessmentRoutes = require('./routes/fluencyAssessment');
const fluencyRoutes = require('./routes/fluencyRoutes');
const receptiveRoutes = require('./routes/receptiveRoutes');
const expressiveRoutes = require('./routes/expressiveRoutes');
const speechRoutes = require('./routes/speechRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/gait', gaitRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);  // Health logs and summary
app.use('/api/articulation', articulationRoutes);  // Progress & exercises
app.use('/api/articulation', articulationAssessmentRoutes);  // Recording assessment
app.use('/api/fluency', fluencyRoutes);  // Fluency progress & exercises
app.use('/api/fluency', fluencyAssessmentRoutes);  // Fluency assessment
app.use('/api/receptive', receptiveRoutes);  // Receptive language therapy
app.use('/api/expressive', expressiveRoutes);  // Expressive language therapy
app.use('/api/speech', speechRoutes);  // Overall speech improvement prediction

// Admin progress endpoints (separate registration for cleaner URLs)
app.use('/api/articulation-progress', articulationRoutes);
app.use('/api/fluency-progress', fluencyRoutes);
app.use('/api/receptive-progress', receptiveRoutes);
app.use('/api/language-progress', expressiveRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CVACare Backend API is running',
    version: '1.0.0'
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
