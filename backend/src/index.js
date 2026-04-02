require('dotenv/config');
const express = require('express');
const cors = require('cors');
const passport = require('passport');

const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/companies.routes');
const dealRoutes = require('./routes/deals.routes');
const miscRoutes = require('./routes/misc.routes');
const csvRoutes = require('./routes/csv.routes');
const rbacRoutes = require('./routes/rbac.routes');
const conversationsRoutes = require('./routes/conversations.routes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth',     authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', companyRoutes);
app.use('/api/deals',    dealRoutes);
app.use('/api/rbac',     rbacRoutes);
app.use('/api',          miscRoutes);
app.use('/api/csv',      csvRoutes);
app.use('/api/conversations', conversationsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CRM API → http://localhost:${PORT}`);
  
  // Start the background job that routes reminders into user chats
  const { startCron } = require('./jobs/cron');
  startCron();
});
