import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';

import authRoutes from './routes/auth.routes';
import companiesRoutes from './routes/companies.routes';
import dealsRoutes from './routes/deals.routes';
import miscRoutes from './routes/misc.routes';
import csvRoutes from './routes/csv.routes';
import rbacRoutes from './routes/rbac.routes';
import conversationsRoutes from './routes/conversations.routes';

// Initialize BullMQ worker (registers it in this process)
// Disabled for now - requires traditional Redis, not REST API
// import './jobs/reminder.worker';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/deals',     dealsRoutes);
app.use('/api/rbac',      rbacRoutes);
app.use('/api',           miscRoutes);   // dashboard, activities, audit-logs
app.use('/api/csv',       csvRoutes);
app.use('/api/conversations', conversationsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
