import express from 'express';
import cors from 'cors'; // kept for reference
import colors from 'colors';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRouter from './Routes/AdminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '.env') });
config({ path: path.join(__dirname, '..', 'Server', '.env') });
mongoose.set('bufferCommands', false);

const app = express();
const publicDir = path.join(__dirname, 'public');
const LOCAL_HOST = '127.0.0.1';
const isLoopbackOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
};

const allowedOrigins = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.ADMIN_CLIENT_URL || '').split(','),
  ...(process.env.CLIENT_URL || '').split(',')
].map((origin) => origin.trim()).filter(Boolean);

const isAllowedOrigin = (origin, req) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow same-origin: admin panel served from this same server
  try {
    const originHost = new URL(origin).hostname;
    const requestHost = req?.headers?.host?.split(':')[0];
    if (requestHost && originHost === requestHost) return true;
  } catch {}
  return false;
};

const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin, req)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
};

const connectDatabase = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('Admin database connection failed DATABASE_URL is missing'.bgRed);
      return;
    }

    await mongoose.connect(process.env.DATABASE_URL, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Admin database connection established'.bgMagenta);
  } catch (error) {
    console.log(`Admin database connection failed ${error.message}`.bgRed);
  }
};

const requireDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send({
      Message: 'Database is not connected yet. Please check DATABASE_URL and try again.',
      success: false
    });
  }

  next();
};

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(corsMiddleware);

app.get('/api/admin/health', (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.send({
    server: 'admin-running',
    database: states[mongoose.connection.readyState] || 'unknown',
    success: mongoose.connection.readyState === 1
  });
});

app.use('/api/admin', requireDatabaseConnection, adminRouter);
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || process.env.ADMIN_PORT || 8081;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin server is running on port ${PORT}`.bgBlue);
});

void connectDatabase();
