import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { GoogleDriveService } from '../services/google.service';
import { db } from '../db';
import { AuthService } from '../services/auth.service';

const router = Router();

// Get OAuth URL
router.get('/auth-url', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUrl = GoogleDriveService.getAuthUrl(req.user!.userId);
    res.json({ url: authUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate Google Drive authorization URL' });
  }
});

// OAuth Callback from Google
router.get('/callback', async (req, res: Response) => {
  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!code || !userId) {
    return res.status(400).send('Authorization failed: Missing code or state.');
  }

  try {
    await GoogleDriveService.handleOAuthCallback(code, userId);
    // Redirect back to frontend settings page
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/settings?drive_connected=true`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/settings?drive_error=${encodeURIComponent(err.message || 'OAuth error')}`);
  }
});

// Check status
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profile = AuthService.toUserProfile(user);
    res.json({
      connected: profile.driveConnected,
      email: profile.driveEmail
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect
router.post('/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await GoogleDriveService.disconnect(req.user!.userId);
    res.json({ message: 'Google Drive disconnected successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Backup to Google Drive
router.post('/backup', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    // Google Drive file upload
    const result = await GoogleDriveService.uploadBackup(
      req.user!.userId,
      filename,
      typeof content === 'string' ? content : JSON.stringify(content)
    );

    res.json({
      success: true,
      file: result,
      message: 'Backup uploaded directly to your Google Drive.'
    });
  } catch (err: any) {
    console.error('Drive upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload backup to Google Drive' });
  }
});

// List backups in user's Drive folder
router.get('/backups', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backups = await GoogleDriveService.listBackups(req.user!.userId);
    res.json({ backups });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list backups' });
  }
});

// Download a backup from user's Drive
router.get('/backup/:fileId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fileId = req.params.fileId;
    const content = await GoogleDriveService.downloadBackup(req.user!.userId, fileId);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to download backup' });
  }
});

export default router;
