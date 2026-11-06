const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const indexHtml = path.join(frontendDist, 'index.html');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { router: healthRoutes, startHealthWorker } = require('./routes/health');
const prefRoutes = require('./routes/preferences');
const analyticsRoutes = require('./routes/analytics');
// const twofaRoutes = require('./routes/twofa');

app.set('trust proxy', 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://192.168.29.159:5173',
  'http://192.168.29.84:5173',
  'https://private-hubweb.netlify.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // No Origin header = same-origin request (safe to allow)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGIN.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions)); // handle preflight requests
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.use(express.json());
// Public ping route for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', adminRoutes); // GET /api/urls, etc.
app.use('/api/health', healthRoutes);
app.use('/api/preferences', prefRoutes);
app.use('/api/analytics', analyticsRoutes);
// app.use('/api/2fa', twofaRoutes);

// ─── Frontend (only if the build exists) ─────────────────────────────────────
if (fs.existsSync(indexHtml)) {
  app.use(express.static(frontendDist));
  app.get('/{*path}', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
} else {
  app.get('/', (req, res) => {
    res.send('Backend is running.');
  });
}

// ─── Database + Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    startHealthWorker();
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));