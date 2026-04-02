/* ─────────────────────────────────────────────
   MOCK DATA — full in-memory CRM dataset
   ───────────────────────────────────────────── */

// ── Base data (mutable so CRUD ops work) ──
let _companies = [
  { id: 'co1', name: 'Acme Corp' },
  { id: 'co2', name: 'TechVentures' },
  { id: 'co3', name: 'NextGen Solutions' },
  { id: 'co4', name: 'Global Industries' },
];

let _contacts = [
  { id: 'ct1', name: 'Alice Johnson',  email: 'alice@acme.com',        phone: '+1 555 0101', companyId: 'co1', status: 'active'   },
  { id: 'ct2', name: 'Bob Smith',      email: 'bob@techventures.com',  phone: '+1 555 0102', companyId: 'co2', status: 'lead'     },
  { id: 'ct3', name: 'Clara Diaz',     email: 'clara@nextgen.io',      phone: '+1 555 0103', companyId: 'co3', status: 'active'   },
  { id: 'ct4', name: 'David Park',     email: 'david@globalind.com',   phone: '+1 555 0104', companyId: 'co4', status: 'inactive' },
  { id: 'ct5', name: 'Eva Turner',     email: 'eva@acme.com',          phone: '+1 555 0105', companyId: 'co1', status: 'lead'     },
  { id: 'ct6', name: 'Frank Lee',      email: 'frank@techventures.com',phone: '+1 555 0106', companyId: 'co2', status: 'active'   },
  { id: 'ct7', name: 'Grace Kim',      email: 'grace@nextgen.io',      phone: '+1 555 0107', companyId: 'co3', status: 'lead'     },
  { id: 'ct8', name: 'Henry Brooks',   email: 'henry@globalind.com',   phone: '+1 555 0108', companyId: 'co4', status: 'active'   },
];

let _deals = [
  { id: 'd1', title: 'Enterprise License',   amount: 48000, stage: 'won',       deadline: '2026-03-20T00:00:00Z', contactId: 'ct1' },
  { id: 'd2', title: 'Cloud Migration',       amount: 92000, stage: 'won',       deadline: '2026-03-28T00:00:00Z', contactId: 'ct3' },
  { id: 'd3', title: 'API Integration Pack',  amount: 24000, stage: 'proposal',  deadline: '2026-04-10T00:00:00Z', contactId: 'ct2' },
  { id: 'd4', title: 'Security Audit',        amount: 15000, stage: 'qualified', deadline: '2026-04-18T00:00:00Z', contactId: 'ct4' },
  { id: 'd5', title: 'SaaS Expansion',        amount: 67000, stage: 'prospect',  deadline: '2026-04-25T00:00:00Z', contactId: 'ct5' },
  { id: 'd6', title: 'Mobile App Dev',        amount: 38000, stage: 'qualified', deadline: '2026-04-30T00:00:00Z', contactId: 'ct6' },
  { id: 'd7', title: 'DevOps Consulting',     amount: 19000, stage: 'proposal',  deadline: '2026-05-05T00:00:00Z', contactId: 'ct7' },
  { id: 'd8', title: 'Analytics Dashboard',   amount: 11000, stage: 'lost',      deadline: '2026-03-15T00:00:00Z', contactId: 'ct8' },
];

let _activities = [
  { id: 'a1', contactId: 'ct1', type: 'call',    note: 'Discussed renewal terms and pricing.',               happenedAt: '2026-04-01T09:00:00Z', durationMinutes: 30, outcome: 'Positive' },
  { id: 'a2', contactId: 'ct2', type: 'email',   note: 'Sent proposal with feature breakdown.',              happenedAt: '2026-04-01T11:30:00Z', durationMinutes: null, outcome: null },
  { id: 'a3', contactId: 'ct3', type: 'meeting', note: 'On-site demo of the CRM module.',                   happenedAt: '2026-03-31T14:00:00Z', durationMinutes: 90, outcome: 'Follow-up scheduled' },
  { id: 'a4', contactId: 'ct4', type: 'call',    note: 'Addressed concerns about data compliance.',         happenedAt: '2026-03-30T10:00:00Z', durationMinutes: 20, outcome: 'Neutral' },
  { id: 'a5', contactId: 'ct5', type: 'email',   note: 'Sent introductory deck and pricing sheet.',         happenedAt: '2026-03-29T16:00:00Z', durationMinutes: null, outcome: null },
  { id: 'a6', contactId: 'ct6', type: 'meeting', note: 'Technical discovery session with eng team.',        happenedAt: '2026-03-28T13:00:00Z', durationMinutes: 60, outcome: 'Demo requested' },
  { id: 'a7', contactId: 'ct7', type: 'call',    note: 'Qualified budget and decision timeline.',           happenedAt: '2026-03-27T09:30:00Z', durationMinutes: 25, outcome: 'Qualified' },
  { id: 'a8', contactId: 'ct8', type: 'email',   note: 'Follow-up after failed negotiation.',               happenedAt: '2026-03-26T17:00:00Z', durationMinutes: null, outcome: null },
];

let _conversations = [
  { id: 'conv1', userAId: 'u1', userBId: 'u2', createdAt: '2026-04-01T08:00:00Z' },
  { id: 'conv2', userAId: 'u1', userBId: 'u3', createdAt: '2026-03-30T12:00:00Z' },
];

let _messages = {
  conv1: [
    { id: 'm1', conversationId: 'conv1', senderId: 'u2', body: 'Hey, did you follow up with Acme Corp?',       createdAt: '2026-04-01T08:05:00Z' },
    { id: 'm2', conversationId: 'conv1', senderId: 'u1', body: 'Yes! Alice confirmed the renewal. 🎉',           createdAt: '2026-04-01T08:10:00Z' },
    { id: 'm3', conversationId: 'conv1', senderId: 'u2', body: 'Awesome work. Lets push the cloud deal next.',  createdAt: '2026-04-01T08:15:00Z' },
  ],
  conv2: [
    { id: 'm4', conversationId: 'conv2', senderId: 'u3', body: 'Need the proposal ready by Friday.',           createdAt: '2026-03-30T12:00:00Z' },
    { id: 'm5', conversationId: 'conv2', senderId: 'u1', body: 'Already drafted – will share EOD.',             createdAt: '2026-03-30T12:30:00Z' },
  ],
};

let _comments = {
  d1: [{ id: 'cm1', dealId: 'd1', authorId: 'u1', body: 'Client signed. Move to billing.', createdAt: '2026-03-20T15:00:00Z' }],
  d2: [{ id: 'cm2', dealId: 'd2', authorId: 'u1', body: 'Clara confirmed scope. Starting onboarding next week.', createdAt: '2026-03-28T10:00:00Z' }],
  d3: [], d4: [], d5: [], d6: [], d7: [], d8: [],
};

// ── Dashboard summary ──
function getDashboardSummary() {
  const wonDeals = _deals.filter(d => d.stage === 'won');
  const wonAmount = wonDeals.reduce((s, d) => s + (d.amount || 0), 0);
  const totalDeals = _deals.length;
  const conversionRate = totalDeals > 0 ? wonDeals.length / totalDeals : 0;
  const now = new Date();
  const upcoming = _deals
    .filter(d => d.deadline && d.stage !== 'won' && d.stage !== 'lost')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 10);
  return { wonAmount, conversionRate, totalDeals, totalContacts: _contacts.length, upcomingDeadlines: upcoming };
}

// ── ID generator ──
let _seq = 100;
function uid() { return 'id_' + (++_seq) + '_' + Math.random().toString(36).slice(2, 7); }

// ── URL helpers ──
function stripQuery(url) { return url.split('?')[0]; }

function parseId(url, prefix) {
  // e.g. "/deals/d1/comments" with prefix "/deals/" → "d1"
  const after = url.slice(prefix.length);
  return after.split('/')[0];
}

// ─────────────────────────────────────────────
export function getMockResponse(method, url, data) {
  const path = stripQuery(url);
  const M = method.toUpperCase();

  // ── AUTH ──
  if (M === 'POST' && path === '/auth/login') {
    return { token: 'mock_token_' + Date.now(), user: { id: 'u1', name: 'Demo User', email: data?.email || 'demo@srm.io' } };
  }
  if (M === 'POST' && path === '/auth/register') {
    return { token: 'mock_token_' + Date.now(), user: { id: uid(), name: data?.fullName || 'New User', email: data?.email || '' } };
  }
  if (M === 'POST' && path === '/auth/forgot-password') {
    return { message: 'If registered, a reset link was sent.', devResetUrl: 'http://localhost:4000/reset-password?token=mock_reset_token' };
  }
  if (M === 'POST' && path === '/auth/reset-password') {
    return { message: 'Password updated.' };
  }

  // ── DASHBOARD ──
  if (M === 'GET' && path === '/dashboard/summary') {
    return getDashboardSummary();
  }

  // ── COMPANIES ──
  if (M === 'GET' && path === '/companies') return _companies;

  // ── CONTACTS ──
  if (M === 'GET' && path === '/contacts') return _contacts;
  if (M === 'POST' && path === '/contacts') {
    const c = { id: uid(), ...data, createdAt: new Date().toISOString() };
    _contacts.push(c);
    return c;
  }

  // ── DEALS ──
  if (M === 'GET' && path === '/deals') return _deals;
  if (M === 'POST' && path === '/deals') {
    const d = { id: uid(), ...data, createdAt: new Date().toISOString() };
    _deals.push(d);
    _comments[d.id] = [];
    return d;
  }
  if (M === 'GET' && path.startsWith('/deals/') && path.endsWith('/comments')) {
    const dealId = parseId(path, '/deals/');
    return _comments[dealId] || [];
  }
  if (M === 'POST' && path.startsWith('/deals/') && path.endsWith('/comments')) {
    const dealId = parseId(path, '/deals/');
    const c = { id: uid(), dealId, authorId: 'u1', ...data, createdAt: new Date().toISOString() };
    if (!_comments[dealId]) _comments[dealId] = [];
    _comments[dealId].push(c);
    return c;
  }
  if ((M === 'PATCH' || M === 'PUT') && path.startsWith('/deals/') && path.endsWith('/stage')) {
    const dealId = parseId(path, '/deals/');
    const deal = _deals.find(d => d.id === dealId);
    if (deal && data?.stage) deal.stage = data.stage;
    return deal || {};
  }
  if (M === 'GET' && path.startsWith('/deals/')) {
    const dealId = parseId(path, '/deals/');
    return _deals.find(d => d.id === dealId) || {};
  }

  // ── ACTIVITIES ──
  if (M === 'GET' && path === '/activities') {
    const contactId = new URLSearchParams(url.split('?')[1] || '').get('contactId');
    return contactId ? _activities.filter(a => a.contactId === contactId) : _activities;
  }
  if (M === 'POST' && path === '/activities') {
    const a = { id: uid(), ...data, createdAt: new Date().toISOString() };
    _activities.unshift(a);
    return a;
  }

  // ── CONVERSATIONS ──
  if (M === 'GET' && path === '/conversations') return _conversations;
  if (M === 'POST' && path === '/conversations') {
    const existing = _conversations.find(c => c.userBId === data?.otherUserId || c.userAId === data?.otherUserId);
    if (existing) return existing;
    const conv = { id: uid(), userAId: 'u1', userBId: data?.otherUserId || uid(), createdAt: new Date().toISOString() };
    _conversations.push(conv);
    _messages[conv.id] = [];
    return conv;
  }
  if (M === 'GET' && path.startsWith('/conversations/') && path.endsWith('/messages')) {
    const convId = parseId(path, '/conversations/');
    return _messages[convId] || [];
  }
  if (M === 'POST' && path.startsWith('/conversations/') && path.endsWith('/messages')) {
    const convId = parseId(path, '/conversations/');
    const msg = { id: uid(), conversationId: convId, senderId: 'u1', ...data, createdAt: new Date().toISOString() };
    if (!_messages[convId]) _messages[convId] = [];
    _messages[convId].push(msg);
    return msg;
  }

  // ── FALLBACK ──
  console.warn('[MOCK] Unhandled:', M, url);
  return {};
}
