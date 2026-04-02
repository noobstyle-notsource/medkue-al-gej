const { Router } = require('express');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { audit } = require('../lib/audit');

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
    if (!req.user) return res.redirect(`${frontendUrl}/login?error=auth_failed`);

    const token = jwt.sign(
      { id: req.user.id, tenantId: req.user.tenantId, roleId: req.user.roleId },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '7d' }
    );
    // Explicitly redirect to AuthCallbackPage with token
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { role: true, tenant: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('[Auth] GET /me error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

router.patch('/me', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name && !email) return res.status(400).json({ error: 'Name or email is required' });

    const existing = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (email && email !== existing.email) {
      const otherUser = await prisma.user.findUnique({ where: { email } });
      if (otherUser) return res.status(409).json({ error: 'Email already in use' });
    }

    const before = { id: existing.id, name: existing.name, email: existing.email };

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || existing.name,
        email: email || existing.email,
      },
    });

    await audit({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'user',
      resourceId: req.user.id,
      before,
      after: { id: updated.id, name: updated.name, email: updated.email },
    });

    res.json(updated);
  } catch (error) {
    console.error('[Auth] PATCH /me error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
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
  console.log('[Auth] Register request body:', req.body);
  try {
    const { email, password, name, organizationName } = req.body;

    if (!email || !password || !name) {
      console.log('[Auth] Validation failed:', { email: !!email, password: !!password, name: !!name });
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('[Auth] User already exists:', existingUser.email);
      return res.status(400).json({ error: 'A user with this email already exists. Please use a different email or try logging in.' });
    }

    // Hash password
    console.log('[Auth] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('[Auth] Password hashed successfully');

    // Create tenant and roles
    console.log('[Auth] Creating tenant with name:', organizationName || `${name}'s Organization`);
    const tenant = await prisma.tenant.create({
      data: { name: organizationName || `${name}'s Organization` }
    });
    console.log('[Auth] Tenant created:', tenant.id);

    const adminRole = await prisma.role.create({
      data: { tenantId: tenant.id, name: 'Admin', permissions: ['*'] },
    });
    console.log('[Auth] Admin role created:', adminRole.id);

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
  console.log('[Auth] Login request body:', req.body);
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      console.log('[Auth] Login validation failed:', { identifier: !!identifier, password: !!password });
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
      return res.status(401).json({ error: 'Password incorrect' });
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    // For security, always return success even if user not found, 
    // unless we're in dev mode where we want to see the link.
    const devMode = process.env.NODE_ENV !== 'production';
    
    if (!user) {
      if (devMode) return res.status(404).json({ error: 'User not found' });
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    // Generate a reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { id: user.id, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '1h' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    const { sendEmail } = require('../lib/email');
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h2>Reset Your Password</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${resetUrl}" style="display:inline-block; background:#7c3aed; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:700; margin: 20px 0;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none; border-top:1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Nexus CRM - Secure Auth Service</p>
        </div>
      `,
    });

    // In dev mode, return the URL for easy testing
    res.json({ 
      message: 'Reset link sent!',
      devResetUrl: devMode ? resetUrl : undefined 
    });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid reset token purpose' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: decoded.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully!' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset link has expired' });
    }
    res.status(400).json({ error: 'Invalid or expired reset token' });
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

