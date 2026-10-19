import { google } from 'googleapis';
import { db } from '../db';
import { Readable } from 'stream';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

export class GoogleDriveService {
  static getOAuth2Client() {
    return new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }

  static isConfigured(): boolean {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  }

  static getAuthUrl(userId: string): string {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured.');
    }

    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: userId
    });
  }

  static async handleOAuthCallback(code: string, userId: string) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user's Google email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    let email: string | undefined;
    try {
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email || undefined;
    } catch (err) {
      console.warn('Could not fetch google userinfo:', err);
    }

    const tokensToSave = {
      ...tokens,
      email
    };

    await db.updateGoogleTokens(userId, tokensToSave);
    return { email };
  }

  static async getAuthenticatedDriveClient(userId: string) {
    const user = await db.findUserById(userId);
    if (!user || !user.google_drive_tokens) {
      throw new Error('Google Drive is not connected for this account.');
    }

    let tokens = user.google_drive_tokens;
    if (typeof tokens === 'string') {
      tokens = JSON.parse(tokens);
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Set refresh token listener to update in DB if renewed
    oauth2Client.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      await db.updateGoogleTokens(userId, merged);
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  private static async getOrCreateSpendWiseFolder(drive: any): Promise<string> {
    const folderName = 'SpendWise Backups';
    const res = await drive.files.list({
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    // Create folder
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Private backup storage for SpendWise Expense Tracker'
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    return folder.data.id!;
  }

  static async uploadBackup(userId: string, filename: string, content: string) {
    const drive = await this.getAuthenticatedDriveClient(userId);
    const folderId = await this.getOrCreateSpendWiseFolder(drive);

    const stream = new Readable();
    stream.push(content);
    stream.push(null);

    // Check if file with same name exists in folder
    const existing = await drive.files.list({
      q: `name = '${filename}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    let fileId: string;
    if (existing.data.files && existing.data.files.length > 0) {
      // Update existing file
      fileId = existing.data.files[0].id!;
      const updated = await drive.files.update({
        fileId: fileId,
        media: {
          mimeType: 'application/json',
          body: stream
        },
        fields: 'id, name, modifiedTime, size'
      });
      return updated.data;
    } else {
      // Create new file
      const fileMetadata = {
        name: filename,
        parents: [folderId],
        description: 'SpendWise financial backup file'
      };
      const created = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: 'application/json',
          body: stream
        },
        fields: 'id, name, modifiedTime, size'
      });
      return created.data;
    }
  }

  static async listBackups(userId: string) {
    const drive = await this.getAuthenticatedDriveClient(userId);
    const folderId = await this.getOrCreateSpendWiseFolder(drive);

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
      spaces: 'drive'
    });

    return res.data.files || [];
  }

  static async downloadBackup(userId: string, fileId: string): Promise<string> {
    const drive = await this.getAuthenticatedDriveClient(userId);
    const res = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'text' }
    );
    return res.data as string;
  }

  static async disconnect(userId: string) {
    const user = await db.findUserById(userId);
    if (user && user.google_drive_tokens) {
      let tokens = user.google_drive_tokens;
      if (typeof tokens === 'string') {
        try { tokens = JSON.parse(tokens); } catch { tokens = null; }
      }
      if (tokens?.access_token) {
        try {
          const oauth2Client = this.getOAuth2Client();
          await oauth2Client.revokeToken(tokens.access_token);
        } catch (err) {
          console.warn('Revoke token warning:', err);
        }
      }
    }
    await db.updateGoogleTokens(userId, null);
  }
}
