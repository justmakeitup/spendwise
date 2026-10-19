import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db, UserRow } from '../db';
import { UserProfile } from '../shared';

const JWT_SECRET = process.env.JWT_SECRET || 'spendwise-super-secret-session-key-32chars!';
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  static toUserProfile(user: UserRow): UserProfile {
    let driveTokens = user.google_drive_tokens;
    if (typeof driveTokens === 'string') {
      try {
        driveTokens = JSON.parse(driveTokens);
      } catch {
        driveTokens = null;
      }
    }

    return {
      id: user.id,
      email: user.email,
      isEmailVerified: !!user.is_email_verified,
      driveConnected: !!(driveTokens && driveTokens.access_token),
      driveEmail: driveTokens?.email || undefined,
      createdAt: typeof user.created_at === 'string' ? user.created_at : user.created_at.toISOString(),
      updatedAt: typeof user.updated_at === 'string' ? user.updated_at : user.updated_at.toISOString()
    };
  }

  static async register(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await this.hashPassword(password);
    const userId = crypto.randomUUID();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const created = await db.createUser({
      id: userId,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      is_email_verified: false,
      verification_token: verificationToken,
      reset_password_token: null,
      reset_password_expires_at: null,
      google_drive_tokens: null
    });

    const token = this.generateToken({ userId: created.id, email: created.email });
    return {
      user: this.toUserProfile(created),
      token
    };
  }

  static async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const user = await db.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const valid = await this.comparePassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password.');
    }

    const token = this.generateToken({ userId: user.id, email: user.email });
    return {
      user: this.toUserProfile(user),
      token
    };
  }

  static async forgotPassword(email: string): Promise<string> {
    const user = await db.findUserByEmail(email);
    if (!user) {
      // Do not reveal if user exists
      return 'If that email exists in our system, password reset instructions have been sent.';
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await db.setResetToken(user.id, resetToken, expiresAt);

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    console.log('--------------------------------------------------');
    console.log(`🔑 PASSWORD RESET LINK for ${user.email}:`);
    console.log(resetUrl);
    console.log('--------------------------------------------------');

    return 'If that email exists in our system, password reset instructions have been sent.';
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await db.findUserByResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired password reset token.');
    }

    const hash = await this.hashPassword(newPassword);
    await db.updateUserPassword(user.id, hash);
  }
}
