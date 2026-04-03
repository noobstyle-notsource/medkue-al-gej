require('dotenv/config');
const express = require('express');
const path = require('path');
require('express-async-errors');
const cors = require('cors');
const passport = require('passport');

const authRoutes        = require('./routes/auth.routes');
const companyRoutes     = require('./routes/companies.routes');
const dealRoutes        = require('./routes/deals.routes');
const miscRoutes        = require('./routes/misc.routes');
const csvRoutes         = require('./routes/csv.routes');
const rbacRoutes        = require('./routes/rbac.routes');
const conversationsRoutes = require('./routes/conversations.routes');
const notificationRoutes = require('./routes/notifications.routes');

const app = express();

// Support multiple allowed origins (comma-separated in FRONTEND_URL)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth',          authRoutes);
app.use('/api/companies',     companyRoutes);
app.use('/api/contacts',      companyRoutes); // alias
app.use('/api/deals',         dealRoutes);
app.use('/api/rbac',          rbacRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api',               miscRoutes);
app.use('/api/csv',           csvRoutes);
app.use('/api/conversations',  conversationsRoutes);

// ── Serve Frontend ────────────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Catch-all: Route all non-API requests to the React app
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.stack || err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CRM API → http://localhost:${PORT}`);

  // ── Background Jobs ──────────────────────────────────────────────────────
  // Probe Redis first — only init BullMQ if Redis is reachable.
  const { redis }       = require('./lib/redis');
  const { initQueue }   = require('./jobs/queue');
  const { startWorker } = require('./jobs/worker');
  const { startCron }   = require('./jobs/cron');

  redis.connect()
    .then(() => {
      const queue = initQueue(redis);
      startWorker(redis);
      startCron(queue);
      console.log('👷 BullMQ active');
    })
    .catch((err) => {
      console.warn('[Startup] Redis unavailable — running without BullMQ:', err.message);
      startCron(null); // setInterval fallback
    });
});
