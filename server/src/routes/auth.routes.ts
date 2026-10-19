import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { SignUpSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../shared';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { db } from '../db';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validated = SignUpSchema.parse(req.body);
    const { user, token } = await AuthService.register(validated.email, validated.password);

    res.cookie('spendwise_token', token, COOKIE_OPTIONS);
    res.status(201).json({ user, token, message: 'Account created successfully.' });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const { user, token } = await AuthService.login(validated.email, validated.password);

    res.cookie('spendwise_token', token, COOKIE_OPTIONS);
    res.json({ user, token, message: 'Welcome back!' });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('spendwise_token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.userId);
    if (!user) {
      res.clearCookie('spendwise_token');
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: AuthService.toUserProfile(user) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const validated = ForgotPasswordSchema.parse(req.body);
    const message = await AuthService.forgotPassword(validated.email);
    res.json({ message });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Reset Password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const validated = ResetPasswordSchema.parse(req.body);
    await AuthService.resetPassword(validated.token, validated.password);
    res.json({ message: 'Password has been successfully reset. Please log in.' });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    res.status(400).json({ error: err.message || 'Password reset failed' });
  }
});

// Delete Account
router.delete('/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.deleteUser(req.user!.userId);
    res.clearCookie('spendwise_token');
    res.json({ message: 'Account successfully deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
