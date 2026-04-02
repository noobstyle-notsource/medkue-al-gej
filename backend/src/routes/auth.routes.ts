import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

const router = Router();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: '/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email in Google profile'));

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // First login — create tenant + roles + user
          const tenant = await prisma.tenant.create({
            data: { name: `${profile.displayName || email}'s Org` },
          });
          // Default role templates (permission matrix)
          const adminRole = await prisma.role.create({
            data: { tenantId: tenant.id, name: 'Admin', permissions: ['*'] },
          });
          const managerRole = await prisma.role.create({
            data: {
              tenantId: tenant.id,
              name: 'Manager',
              permissions: [
                'contacts:read',
                'contacts:write',
                'contacts:delete',
                'deals:read',
                'deals:write',
                // Removed 'audit:read' - only admins should see audit logs
              ],
            },
          });
          await prisma.role.create({
            data: {
              tenantId: tenant.id,
              name: 'Sales',
              permissions: [
                'contacts:read',
                'contacts:write',
                'deals:read',
                'deals:write',
              ],
            },
          });
          
          // Check if this is the owner's Google account
          const isOwner = email === 'misheelmother@gmail.com';
          
          user = await prisma.user.create({
            data: {
              tenantId: tenant.id,
              email,
              name: profile.displayName || email,
              googleId: profile.id,
              roleId: isOwner ? adminRole.id : managerRole.id, // Owner gets Admin, others get Manager
            },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=1` }),
  (req, res) => {
    const user = req.user as { id: string; tenantId: string; roleId: string | null };
    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '7d' }
    );
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// GET /api/auth/me — validate token and return user info
router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'No token' }); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me') as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true, tenant: true },
    });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/register — email/password registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, organizationName } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant and roles for first user
    const tenant = await prisma.tenant.create({
      data: { name: organizationName || `${name}'s Organization` },
    });

    // Create default roles
    const adminRole = await prisma.role.create({
      data: { tenantId: tenant.id, name: 'Admin', permissions: ['*'] },
    });
    const managerRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Manager',
        permissions: [
          'contacts:read',
          'contacts:write',
          'contacts:delete',
          'deals:read',
          'deals:write',
        ],
      },
    });
    await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Sales',
        permissions: [
          'contacts:read',
          'contacts:write',
          'deals:read',
          'deals:write',
        ],
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name,
        password: hashedPassword,
        roleId: managerRole.id, // First user gets Manager role, not Admin
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login — email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, tenant: true },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
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

// POST /api/auth/dev-login — development only
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const email = req.body.email || 'dev@example.com';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const tenant = await prisma.tenant.create({ data: { name: 'Dev Organization' } });
    const adminRole = await prisma.role.create({ 
      data: { tenantId: tenant.id, name: 'Admin', permissions: ['*'] } 
    });
    await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Manager',
        permissions: [
          'contacts:read',
          'contacts:write',
          'contacts:delete',
          'deals:read',
          'deals:write',
        ],
      },
    });
    await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Sales',
        permissions: [
          'contacts:read',
          'contacts:write',
          'deals:read',
          'deals:write',
        ],
      },
    });
    user = await prisma.user.create({
      data: { tenantId: tenant.id, email, name: 'Dev Admin', roleId: adminRole.id },
    });
  }

  const token = jwt.sign(
    { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
    process.env.JWT_SECRET || 'change-me',
    { expiresIn: '7d' }
  );

  res.json({ token, user });
});

export default router;
