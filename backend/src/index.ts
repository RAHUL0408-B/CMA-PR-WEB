import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost, the frontend env URL, and Netlify deploys
    if (!origin || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('http://127.0.0.1') || 
        origin === process.env.FRONTEND_URL ||
        origin === 'https://cmaweb.netlify.app' ||
        origin.endsWith('.netlify.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }
}));
app.use(express.json({ limit: '50mb' }));

// ============================================================
// ROUTES
// ============================================================
import clientRoutes from './routes/clients.js';
import reportRoutes from './routes/reports.js';
import financialRoutes from './routes/financials.js';
import projectionRoutes from './routes/projections.js';
import aiRoutes from './routes/ai.js';
import exportRoutes from './routes/exports.js';
import mappingRoutes from './routes/mappings.js';
import authRoutes from './routes/auth.js';

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', service: 'CMA Pro AI API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/projections', projectionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/mappings', mappingRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`\n🚀 CMA Pro AI Server running at http://localhost:${port}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
