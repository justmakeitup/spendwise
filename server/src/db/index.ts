import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  is_email_verified: boolean;
  verification_token?: string | null;
  reset_password_token?: string | null;
  reset_password_expires_at?: Date | string | null;
  google_drive_tokens?: any | null;
  created_at: Date | string;
  updated_at: Date | string;
}

class DatabaseManager {
  private pool: Pool | null = null;
  private isFallback = false;
  private memoryUsers: Map<string, UserRow> = new Map();

  async initialize() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.warn('⚠️  DATABASE_URL not set. Running with In-Memory Auth DB fallback for development/testing.');
      console.warn('💡 Set DATABASE_URL to your Neon PostgreSQL connection string to persist accounts.');
      this.isFallback = true;
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      // Test connection
      const client = await this.pool.connect();
      try {
        console.log('✅ Successfully connected to Neon PostgreSQL (Authentication DB)');
        await this.runMigrations();
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('❌ Failed to connect to Neon PostgreSQL:', err);
      console.warn('⚠️  Falling back to In-Memory Auth DB for now.');
      this.isFallback = true;
    }
  }

  private async runMigrations() {
    const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (!unpooledUrl) return;

    const migrationClient = new Pool({
      connectionString: unpooledUrl,
      ssl: unpooledUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
      let schemaSql = '';
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        schemaSql = fs.readFileSync(schemaPath, 'utf8');
      } else {
        // Embedded schema fallback for production bundles and Vercel serverless
        schemaSql = `
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_email_verified BOOLEAN DEFAULT FALSE,
            verification_token VARCHAR(255),
            reset_password_token VARCHAR(255),
            reset_password_expires_at TIMESTAMP WITH TIME ZONE,
            google_drive_tokens JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);
        `;
      }

      await migrationClient.query(schemaSql);
      console.log('✅ Applied Neon PostgreSQL database migrations successfully');
    } catch (err) {
      console.error('Migration failed:', err);
    } finally {
      await migrationClient.end();
    }
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.isFallback) {
      for (const user of this.memoryUsers.values()) {
        if (user.email === normalizedEmail) return { ...user };
      }
      return null;
    }

    const res = await this.pool!.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );
    return res.rows[0] || null;
  }

  async findUserById(id: string): Promise<UserRow | null> {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      return user ? { ...user } : null;
    }

    const res = await this.pool!.query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return res.rows[0] || null;
  }

  async findUserByResetToken(token: string): Promise<UserRow | null> {
    if (this.isFallback) {
      for (const user of this.memoryUsers.values()) {
        if (user.reset_password_token === token) {
          const expiresAt = user.reset_password_expires_at ? new Date(user.reset_password_expires_at).getTime() : 0;
          if (expiresAt > Date.now()) {
            return { ...user };
          }
        }
      }
      return null;
    }

    const res = await this.pool!.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires_at > NOW() LIMIT 1',
      [token]
    );
    return res.rows[0] || null;
  }

  async createUser(user: Omit<UserRow, 'created_at' | 'updated_at'>): Promise<UserRow> {
    const now = new Date();
    const newUser: UserRow = {
      ...user,
      created_at: now,
      updated_at: now
    };

    if (this.isFallback) {
      this.memoryUsers.set(user.id, newUser);
      return { ...newUser };
    }

    const res = await this.pool!.query(
      `INSERT INTO users (id, email, password_hash, is_email_verified, verification_token, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [newUser.id, newUser.email, newUser.password_hash, newUser.is_email_verified, newUser.verification_token, newUser.created_at, newUser.updated_at]
    );
    return res.rows[0];
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      if (user) {
        user.password_hash = passwordHash;
        user.reset_password_token = null;
        user.reset_password_expires_at = null;
        user.updated_at = new Date();
      }
      return;
    }

    await this.pool!.query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = NOW() 
       WHERE id = $2`,
      [passwordHash, id]
    );
  }

  async setResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      if (user) {
        user.reset_password_token = token;
        user.reset_password_expires_at = expiresAt;
        user.updated_at = new Date();
      }
      return;
    }

    await this.pool!.query(
      `UPDATE users 
       SET reset_password_token = $1, reset_password_expires_at = $2, updated_at = NOW() 
       WHERE id = $3`,
      [token, expiresAt, id]
    );
  }

  async updateGoogleTokens(id: string, tokens: any): Promise<void> {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      if (user) {
        user.google_drive_tokens = tokens;
        user.updated_at = new Date();
      }
      return;
    }

    await this.pool!.query(
      `UPDATE users 
       SET google_drive_tokens = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(tokens), id]
    );
  }

  async deleteUser(id: string): Promise<void> {
    if (this.isFallback) {
      this.memoryUsers.delete(id);
      return;
    }

    await this.pool!.query('DELETE FROM users WHERE id = $1', [id]);
  }

  getIsFallback(): boolean {
    return this.isFallback;
  }
}

export const db = new DatabaseManager();
