import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for production pathing
const IS_PROD = process.env.NODE_ENV === 'production';
const DIST_PATH = path.join(process.cwd(), 'dist');

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
if (projectId) {
  try {
    admin.initializeApp({
      projectId: projectId,
    });
    console.log('Firebase Admin initialized');
  } catch (e) {
    console.warn('Firebase Admin initialization failed:', e);
  }
}

// Initialize Supabase (Optional fallback)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.sendStatus(403);
    }
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/avatar', (req, res) => {
    // Return Beatrice avatar URL or image
    res.redirect('https://ui-avatars.com/api/?name=Beatrice&background=cbfb45&color=000&size=200');
  });

  // Settings
  app.get('/api/settings', authenticateToken, async (req: any, res) => {
    // Implementation should fetch from Supabase if available, else return defaults
    res.json({
      personaName: 'Beatrice',
      userCallName: 'Boss',
      voice: 'Puck',
      language: 'English',
      systemPrompt: 'Classic Beatrice behavior.'
    });
  });

  app.put('/api/settings', authenticateToken, async (req, res) => {
    res.json({ success: true });
  });

  // Memories
  app.get('/api/memories', authenticateToken, async (req: any, res) => {
    res.json({ memories: [] });
  });

  app.post('/api/memories', authenticateToken, async (req: any, res) => {
    res.status(201).json({ id: 'new-memory-id', ...req.body });
  });

  app.delete('/api/memories/:id', authenticateToken, async (req, res) => {
    res.json({ success: true });
  });

  // Search Proxy (Grounded)
  app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    res.json({ results: [`Mock search results for: ${q}`] });
  });

  // Vite Middleware
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_PATH));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(DIST_PATH, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Eburon AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
