const { Router } = require('express');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { prisma } = require('../lib/prisma');

const router = Router();

function pickFrontendUrl(req) {
  const fallback = process.env.FRONTEND_URL || 'http://localhost:5173';
  const origin = req.get('origin');
  const referer = req.get('referer');
  const stateUrl = req.query?.state;
  let refererOrigin = null;
  if (referer) {
    try {
      const r = new URL(referer);
      refererOrigin = `${r.protocol}//${r.host}`;
    } catch {
      refererOrigin = null;
    }
  }
  const input = stateUrl || origin || refererOrigin || fallback;
  try {
    const u = new URL(input);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (!isLocal || (u.protocol !== 'http:' && u.protocol !== 'https:')) return fallback;
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/api/auth/google/callback',
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email in Google profile'));

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        const tenant = await prisma.tenant.create({ data: { name: `${profile.displayName || email}'s Org` } });
        const adminRole = await prisma.role.create({
          data: { tenantId: tenant.id, name: 'Admin', permissions: ['*'] },
        });
        await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Manager',
            permissions: [
              'companies:read',
              'companies:write',
              'companies:delete',
              'deals:read',
              'deals:write',
              'audit:read',
            ],
          },
        });
        await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Sales',
            permissions: [
              'companies:read',
              'companies:write',
              'deals:read',
              'deals:write',
            ],
          },
        });
        
        // Create regular User role with limited permissions
        const userRole = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'User',
            permissions: [
              'companies:read',
              'companies:write',
              'deals:read',
              'deals:write',
            ],
          },
        });
        
        user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email,
            name: profile.displayName || email,
            googleId: profile.id,
            roleId: userRole.id,  // User role, not Admin
          },
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

router.get('/google', (req, res, next) => {
  const frontendUrl = pickFrontendUrl(req);
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: frontendUrl,
  })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    const frontendUrl = pickFrontendUrl(req);
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${frontendUrl}/login?error=1`,
    })(req, res, next);
  },
  (req, res) => {
    const frontendUrl = pickFrontendUrl(req);
    const token = jwt.sign(
      { id: req.user.id, tenantId: req.user.tenantId, roleId: req.user.roleId },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '7d' }
    );
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { role: true, tenant: true } });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/auth/users — list all teammates in same tenant
router.get('/users', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    const users = await prisma.user.findMany({
      where: { tenantId: decoded.tenantId },
      select: { id: true, name: true, email: true, roleId: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Traditional email/password registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, organizationName } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant and roles
    const tenant = await prisma.tenant.create({ 
      data: { name: organizationName || `${name}'s Organization` } 
    });
    
    const adminRole = await prisma.role.create({
      data: { tenantId: tenant.id, name: 'Admin', permissions: ['*'] },
    });

    await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Manager',
        permissions: [
          'companies:read',
          'companies:write',
          'companies:delete',
          'deals:read',
          'deals:write',
          'audit:read',
        ],
      },
    });

    await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Sales',
        permissions: [
          'companies:read',
          'companies:write',
          'deals:read',
          'deals:write',
        ],
      },
    });

    // Create regular User role with limited permissions
    const userRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'User',
        permissions: [
          'companies:read',
          'companies:write',
          'deals:read',
          'deals:write',
        ],
      },
    });

    // Create user with regular User role (not Admin)
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name,
        password: hashedPassword,
        roleId: userRole.id,
      },
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: userRole } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Traditional email/password login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by email OR username(name)
    const user = await prisma.user.findFirst({ 
      where: {
        OR: [
          { email: identifier },
          { name: identifier },
        ],
      },
      include: { role: true, tenant: true }
    });
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// DEV ONLY — auto-creates a test user and returns a token (remove in production)
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });

  const email = req.body.email || 'dev@example.com';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const tenant = await prisma.tenant.create({ data: { name: 'Dev Organization' } });
    
    const userRole = await prisma.role.create({ 
      data: { tenantId: tenant.id, name: 'User', permissions: ['companies:read', 'companies:write', 'deals:read', 'deals:write'] } 
    });
    
    await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Manager',
        permissions: [
          'companies:read',
          'companies:write',
          'companies:delete',
          'deals:read',
          'deals:write',
          'audit:read',
        ],
      },
    });
    
    await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Sales',
        permissions: [
          'companies:read',
          'companies:write',
          'deals:read',
          'deals:write',
        ],
      },
    });
    
    user = await prisma.user.create({
      data: { tenantId: tenant.id, email, name: 'Dev Admin', roleId: userRole.id },  // User role, not Admin
    });
  }

  const token = jwt.sign(
    { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
    process.env.JWT_SECRET || 'change-me',
    { expiresIn: '7d' }
  );

  res.json({ token, user });
});

module.exports = router;

