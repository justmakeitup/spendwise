import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local and .env across root and server
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { db } from './db';
import authRoutes from './routes/auth.routes';
import driveRoutes from './routes/drive.routes';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS setup
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Capacitor) or local dev origins
    if (
      !origin ||
      origin === CLIENT_URL ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      /^http:\/\/(192\.168|10|172\.(1[6-9]|2[0-9]|3[0-1]))\.\d+\.\d+(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // 100 requests per 15 min window
  message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Direct APK download route with explicit Android package MIME type
app.get(['/spendwise.apk', '/api/download/apk'], (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, '../../client/public/spendwise.apk'),
    path.resolve(__dirname, '../../client/dist/spendwise.apk'),
    path.resolve(process.cwd(), 'client/public/spendwise.apk'),
    path.resolve(process.cwd(), 'client/dist/spendwise.apk')
  ];

  const apkPath = possiblePaths.find(p => fs.existsSync(p));

  if (!apkPath) {
    return res.status(404).json({ error: 'APK file not found.' });
  }

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="SpendWise.apk"');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(apkPath);
});

// Ensure DB is initialized before handling any requests
let dbInitPromise: Promise<void> | null = null;
app.use(async (req, res, next) => {
  if (!dbInitPromise) {
    dbInitPromise = db.initialize().catch(err => {
      console.error('Error during database initialization:', err);
    });
  }
  await dbInitPromise;
  next();
});

// Health and privacy verification route (supports both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'SpendWise Authentication API',
    neonConnected: !db.getIsFallback(),
    privacyNote: 'Zero financial data is stored in the database. Only credentials and auth sessions are managed here.'
  });
});

// Routes (supports both /api/auth and /auth prefixes)
app.use(['/api/auth', '/auth'], authLimiter, authRoutes);
app.use(['/api/drive', '/drive'], driveRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start listening on port in local/standalone environments (on Vercel, requests are handled via exported app)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 SpendWise Backend running on port ${PORT}`);
    console.log(`🔒 Privacy Architecture: Database holds auth credentials only.`);
  });
  db.initialize().catch(err => console.error('Error during initial DB connect:', err));
}

export default app;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  module.exports.default = app;
}
