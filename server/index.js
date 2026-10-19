"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_dotenv = __toESM(require("dotenv"));
var import_path2 = __toESM(require("path"));
var import_express3 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));
var import_helmet = __toESM(require("helmet"));
var import_express_rate_limit = __toESM(require("express-rate-limit"));
var import_fs2 = __toESM(require("fs"));

// src/db/index.ts
var import_pg = require("pg");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var DatabaseManager = class {
  pool = null;
  isFallback = false;
  memoryUsers = /* @__PURE__ */ new Map();
  async initialize() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn("\u26A0\uFE0F  DATABASE_URL not set. Running with In-Memory Auth DB fallback for development/testing.");
      console.warn("\u{1F4A1} Set DATABASE_URL to your Neon PostgreSQL connection string to persist accounts.");
      this.isFallback = true;
      return;
    }
    try {
      this.pool = new import_pg.Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
      });
      const client = await this.pool.connect();
      try {
        console.log("\u2705 Successfully connected to Neon PostgreSQL (Authentication DB)");
        await this.runMigrations();
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("\u274C Failed to connect to Neon PostgreSQL:", err);
      console.warn("\u26A0\uFE0F  Falling back to In-Memory Auth DB for now.");
      this.isFallback = true;
    }
  }
  async runMigrations() {
    const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (!unpooledUrl) return;
    const migrationClient = new import_pg.Pool({
      connectionString: unpooledUrl,
      ssl: unpooledUrl.includes("localhost") ? false : { rejectUnauthorized: false }
    });
    try {
      let schemaSql = "";
      const schemaPath = import_path.default.join(__dirname, "schema.sql");
      if (import_fs.default.existsSync(schemaPath)) {
        schemaSql = import_fs.default.readFileSync(schemaPath, "utf8");
      } else {
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
      console.log("\u2705 Applied Neon PostgreSQL database migrations successfully");
    } catch (err) {
      console.error("Migration failed:", err);
    } finally {
      await migrationClient.end();
    }
  }
  async findUserByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.isFallback) {
      for (const user of this.memoryUsers.values()) {
        if (user.email === normalizedEmail) return { ...user };
      }
      return null;
    }
    const res = await this.pool.query(
      "SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [normalizedEmail]
    );
    return res.rows[0] || null;
  }
  async findUserById(id) {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      return user ? { ...user } : null;
    }
    const res = await this.pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [id]
    );
    return res.rows[0] || null;
  }
  async findUserByResetToken(token) {
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
    const res = await this.pool.query(
      "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires_at > NOW() LIMIT 1",
      [token]
    );
    return res.rows[0] || null;
  }
  async createUser(user) {
    const now = /* @__PURE__ */ new Date();
    const newUser = {
      ...user,
      created_at: now,
      updated_at: now
    };
    if (this.isFallback) {
      this.memoryUsers.set(user.id, newUser);
      return { ...newUser };
    }
    const res = await this.pool.query(
      `INSERT INTO users (id, email, password_hash, is_email_verified, verification_token, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [newUser.id, newUser.email, newUser.password_hash, newUser.is_email_verified, newUser.verification_token, newUser.created_at, newUser.updated_at]
    );
    return res.rows[0];
  }
  async updateUserPassword(id, passwordHash) {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      if (user) {
        user.password_hash = passwordHash;
        user.reset_password_token = null;
        user.reset_password_expires_at = null;
        user.updated_at = /* @__PURE__ */ new Date();
      }
      return;
    }
    await this.pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = NOW() 
       WHERE id = $2`,
      [passwordHash, id]
    );
  }
  async setResetToken(id, token, expiresAt) {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      if (user) {
        user.reset_password_token = token;
        user.reset_password_expires_at = expiresAt;
        user.updated_at = /* @__PURE__ */ new Date();
      }
      return;
    }
    await this.pool.query(
      `UPDATE users 
       SET reset_password_token = $1, reset_password_expires_at = $2, updated_at = NOW() 
       WHERE id = $3`,
      [token, expiresAt, id]
    );
  }
  async updateGoogleTokens(id, tokens) {
    if (this.isFallback) {
      const user = this.memoryUsers.get(id);
      if (user) {
        user.google_drive_tokens = tokens;
        user.updated_at = /* @__PURE__ */ new Date();
      }
      return;
    }
    await this.pool.query(
      `UPDATE users 
       SET google_drive_tokens = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(tokens), id]
    );
  }
  async deleteUser(id) {
    if (this.isFallback) {
      this.memoryUsers.delete(id);
      return;
    }
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
  getIsFallback() {
    return this.isFallback;
  }
};
var db = new DatabaseManager();

// src/routes/auth.routes.ts
var import_express = require("express");

// src/services/auth.service.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_crypto = __toESM(require("crypto"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET || "spendwise-super-secret-session-key-32chars!";
var TOKEN_EXPIRY = "7d";
var AuthService = class {
  static async hashPassword(password) {
    const salt = await import_bcryptjs.default.genSalt(12);
    return import_bcryptjs.default.hash(password, salt);
  }
  static async comparePassword(password, hash) {
    return import_bcryptjs.default.compare(password, hash);
  }
  static generateToken(payload) {
    return import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }
  static verifyToken(token) {
    try {
      return import_jsonwebtoken.default.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
  static toUserProfile(user) {
    let driveTokens = user.google_drive_tokens;
    if (typeof driveTokens === "string") {
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
      driveEmail: driveTokens?.email || void 0,
      createdAt: typeof user.created_at === "string" ? user.created_at : user.created_at.toISOString(),
      updatedAt: typeof user.updated_at === "string" ? user.updated_at : user.updated_at.toISOString()
    };
  }
  static async register(email, password) {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }
    const passwordHash = await this.hashPassword(password);
    const userId = import_crypto.default.randomUUID();
    const verificationToken = import_crypto.default.randomBytes(32).toString("hex");
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
  static async login(email, password) {
    const user = await db.findUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password.");
    }
    const valid = await this.comparePassword(password, user.password_hash);
    if (!valid) {
      throw new Error("Invalid email or password.");
    }
    const token = this.generateToken({ userId: user.id, email: user.email });
    return {
      user: this.toUserProfile(user),
      token
    };
  }
  static async forgotPassword(email) {
    const user = await db.findUserByEmail(email);
    if (!user) {
      return "If that email exists in our system, password reset instructions have been sent.";
    }
    const resetToken = import_crypto.default.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 36e5);
    await db.setResetToken(user.id, resetToken, expiresAt);
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
    console.log("--------------------------------------------------");
    console.log(`\u{1F511} PASSWORD RESET LINK for ${user.email}:`);
    console.log(resetUrl);
    console.log("--------------------------------------------------");
    return "If that email exists in our system, password reset instructions have been sent.";
  }
  static async resetPassword(token, newPassword) {
    const user = await db.findUserByResetToken(token);
    if (!user) {
      throw new Error("Invalid or expired password reset token.");
    }
    const hash = await this.hashPassword(newPassword);
    await db.updateUserPassword(user.id, hash);
  }
};

// src/shared/schemas.ts
var import_zod = require("zod");
var PasswordSchema = import_zod.z.string().min(8, "Password must be at least 8 characters long").max(128, "Password must not exceed 128 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");
var SignUpSchema = import_zod.z.object({
  email: import_zod.z.string().trim().email("Invalid email address").toLowerCase(),
  password: PasswordSchema,
  confirmPassword: import_zod.z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
var LoginSchema = import_zod.z.object({
  email: import_zod.z.string().trim().email("Invalid email address").toLowerCase(),
  password: import_zod.z.string().min(1, "Password is required")
});
var ForgotPasswordSchema = import_zod.z.object({
  email: import_zod.z.string().trim().email("Invalid email address").toLowerCase()
});
var ResetPasswordSchema = import_zod.z.object({
  token: import_zod.z.string().min(1, "Reset token is required"),
  password: PasswordSchema,
  confirmPassword: import_zod.z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
var TransactionSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  type: import_zod.z.enum(["income", "expense"]),
  amount: import_zod.z.number().int().positive("Amount must be positive"),
  currency: import_zod.z.string().length(3).toUpperCase(),
  categoryId: import_zod.z.string().min(1, "Category is required"),
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, "Invalid date format"),
  paymentMethod: import_zod.z.string().min(1, "Payment method is required"),
  note: import_zod.z.string().max(500, "Note cannot exceed 500 characters").optional(),
  tags: import_zod.z.array(import_zod.z.string().trim().min(1).max(30)).optional(),
  account: import_zod.z.string().max(50).optional(),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string()
});
var CategorySchema = import_zod.z.object({
  id: import_zod.z.string().min(1),
  name: import_zod.z.string().trim().min(1, "Category name required").max(50),
  type: import_zod.z.enum(["income", "expense", "both"]),
  icon: import_zod.z.string().min(1),
  color: import_zod.z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color"),
  isDefault: import_zod.z.boolean().optional()
});
var BudgetSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  month: import_zod.z.string().regex(/^\d{4}-\d{2}$/, "Month format must be YYYY-MM"),
  categoryId: import_zod.z.string().min(1),
  limitAmount: import_zod.z.number().int().nonnegative("Limit must be 0 or positive"),
  rolloverEnabled: import_zod.z.boolean().optional(),
  previousRollover: import_zod.z.number().int().optional()
});
var RecurringRuleSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  name: import_zod.z.string().trim().min(1, "Rule name is required").max(100),
  type: import_zod.z.enum(["income", "expense"]),
  amount: import_zod.z.number().int().positive("Amount must be positive"),
  currency: import_zod.z.string().length(3).toUpperCase(),
  categoryId: import_zod.z.string().min(1),
  frequency: import_zod.z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  customIntervalDays: import_zod.z.number().int().positive().optional(),
  startDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format must be YYYY-MM-DD"),
  endDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format must be YYYY-MM-DD").optional().nullable(),
  nextDueDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format must be YYYY-MM-DD"),
  paymentMethod: import_zod.z.string().optional(),
  reminderDaysBefore: import_zod.z.number().int().nonnegative().optional(),
  status: import_zod.z.enum(["active", "paused"]),
  autoCreate: import_zod.z.boolean().optional(),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string()
});
var SavingsGoalSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  name: import_zod.z.string().trim().min(1, "Goal name is required").max(100),
  targetAmount: import_zod.z.number().int().positive("Target amount must be positive"),
  currentAmount: import_zod.z.number().int().nonnegative(),
  targetDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be YYYY-MM-DD"),
  categoryId: import_zod.z.string().optional(),
  note: import_zod.z.string().max(500).optional(),
  contributions: import_zod.z.array(import_zod.z.object({
    id: import_zod.z.string().uuid(),
    amount: import_zod.z.number().int().positive(),
    date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: import_zod.z.string().max(200).optional()
  })),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string()
});
var UserPreferencesSchema = import_zod.z.object({
  currency: import_zod.z.string().length(3).toUpperCase(),
  locale: import_zod.z.string().min(2),
  firstDayOfWeek: import_zod.z.number().int().min(0).max(6),
  theme: import_zod.z.enum(["dark", "light", "system"]),
  budgetThresholds: import_zod.z.array(import_zod.z.number().min(1).max(200)),
  budgetRolloverDefault: import_zod.z.boolean(),
  autoBackup: import_zod.z.boolean(),
  backupFrequency: import_zod.z.enum(["realtime", "daily", "weekly", "manual"]),
  encryptionEnabled: import_zod.z.boolean(),
  lastBackupAt: import_zod.z.string().optional(),
  lastSyncAt: import_zod.z.string().optional()
});
var FinancialDataPayloadSchema = import_zod.z.object({
  schemaVersion: import_zod.z.number().int().positive(),
  revision: import_zod.z.number().int().nonnegative(),
  exportedAt: import_zod.z.string(),
  transactions: import_zod.z.array(TransactionSchema),
  categories: import_zod.z.array(CategorySchema),
  budgets: import_zod.z.array(BudgetSchema),
  recurringRules: import_zod.z.array(RecurringRuleSchema),
  savingsGoals: import_zod.z.array(SavingsGoalSchema),
  preferences: UserPreferencesSchema
});
var EncryptedBackupPayloadSchema = import_zod.z.object({
  schemaVersion: import_zod.z.number().int().positive(),
  revision: import_zod.z.number().int().nonnegative(),
  encrypted: import_zod.z.literal(true),
  algorithm: import_zod.z.literal("AES-GCM-256"),
  kdf: import_zod.z.literal("PBKDF2"),
  salt: import_zod.z.string().min(16),
  nonce: import_zod.z.string().min(12),
  ciphertext: import_zod.z.string().min(1),
  authTag: import_zod.z.string().optional(),
  exportedAt: import_zod.z.string()
});

// src/middleware/auth.middleware.ts
function requireAuth(req, res, next) {
  let token = req.cookies?.spendwise_token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  const payload = AuthService.verifyToken(token);
  if (!payload) {
    res.clearCookie("spendwise_token");
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
  req.user = payload;
  next();
}

// src/routes/auth.routes.ts
var router = (0, import_express.Router)();
var COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1e3
  // 7 days
};
router.post("/register", async (req, res) => {
  try {
    const validated = SignUpSchema.parse(req.body);
    const { user, token } = await AuthService.register(validated.email, validated.password);
    res.cookie("spendwise_token", token, COOKIE_OPTIONS);
    res.status(201).json({ user, token, message: "Account created successfully." });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || "Validation error" });
    }
    res.status(400).json({ error: err.message || "Registration failed" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const { user, token } = await AuthService.login(validated.email, validated.password);
    res.cookie("spendwise_token", token, COOKIE_OPTIONS);
    res.json({ user, token, message: "Welcome back!" });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || "Validation error" });
    }
    res.status(401).json({ error: err.message || "Login failed" });
  }
});
router.post("/logout", (req, res) => {
  res.clearCookie("spendwise_token");
  res.json({ message: "Logged out successfully" });
});
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.userId);
    if (!user) {
      res.clearCookie("spendwise_token");
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: AuthService.toUserProfile(user) });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve profile" });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const validated = ForgotPasswordSchema.parse(req.body);
    const message = await AuthService.forgotPassword(validated.email);
    res.json({ message });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || "Validation error" });
    }
    res.status(400).json({ error: err.message });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const validated = ResetPasswordSchema.parse(req.body);
    await AuthService.resetPassword(validated.token, validated.password);
    res.json({ message: "Password has been successfully reset. Please log in." });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || "Validation error" });
    }
    res.status(400).json({ error: err.message || "Password reset failed" });
  }
});
router.delete("/account", requireAuth, async (req, res) => {
  try {
    await db.deleteUser(req.user.userId);
    res.clearCookie("spendwise_token");
    res.json({ message: "Account successfully deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});
var auth_routes_default = router;

// src/routes/drive.routes.ts
var import_express2 = require("express");

// src/services/google.service.ts
var import_googleapis = require("googleapis");
var import_stream = require("stream");
var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
var GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/auth/google/callback";
var GoogleDriveService = class {
  static getOAuth2Client() {
    return new import_googleapis.google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }
  static isConfigured() {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  }
  static getAuthUrl(userId) {
    if (!this.isConfigured()) {
      throw new Error("Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured.");
    }
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email"
      ],
      state: userId
    });
  }
  static async handleOAuthCallback(code, userId) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = import_googleapis.google.oauth2({ version: "v2", auth: oauth2Client });
    let email;
    try {
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email || void 0;
    } catch (err) {
      console.warn("Could not fetch google userinfo:", err);
    }
    const tokensToSave = {
      ...tokens,
      email
    };
    await db.updateGoogleTokens(userId, tokensToSave);
    return { email };
  }
  static async getAuthenticatedDriveClient(userId) {
    const user = await db.findUserById(userId);
    if (!user || !user.google_drive_tokens) {
      throw new Error("Google Drive is not connected for this account.");
    }
    let tokens = user.google_drive_tokens;
    if (typeof tokens === "string") {
      tokens = JSON.parse(tokens);
    }
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    oauth2Client.on("tokens", async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      await db.updateGoogleTokens(userId, merged);
    });
    return import_googleapis.google.drive({ version: "v3", auth: oauth2Client });
  }
  static async getOrCreateSpendWiseFolder(drive) {
    const folderName = "SpendWise Backups";
    const res = await drive.files.list({
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive"
    });
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      description: "Private backup storage for SpendWise Expense Tracker"
    };
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id"
    });
    return folder.data.id;
  }
  static async uploadBackup(userId, filename, content) {
    const drive = await this.getAuthenticatedDriveClient(userId);
    const folderId = await this.getOrCreateSpendWiseFolder(drive);
    const stream = new import_stream.Readable();
    stream.push(content);
    stream.push(null);
    const existing = await drive.files.list({
      q: `name = '${filename}' and '${folderId}' in parents and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive"
    });
    let fileId;
    if (existing.data.files && existing.data.files.length > 0) {
      fileId = existing.data.files[0].id;
      const updated = await drive.files.update({
        fileId,
        media: {
          mimeType: "application/json",
          body: stream
        },
        fields: "id, name, modifiedTime, size"
      });
      return updated.data;
    } else {
      const fileMetadata = {
        name: filename,
        parents: [folderId],
        description: "SpendWise financial backup file"
      };
      const created = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: "application/json",
          body: stream
        },
        fields: "id, name, modifiedTime, size"
      });
      return created.data;
    }
  }
  static async listBackups(userId) {
    const drive = await this.getAuthenticatedDriveClient(userId);
    const folderId = await this.getOrCreateSpendWiseFolder(drive);
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, modifiedTime, size)",
      orderBy: "modifiedTime desc",
      spaces: "drive"
    });
    return res.data.files || [];
  }
  static async downloadBackup(userId, fileId) {
    const drive = await this.getAuthenticatedDriveClient(userId);
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    return res.data;
  }
  static async disconnect(userId) {
    const user = await db.findUserById(userId);
    if (user && user.google_drive_tokens) {
      let tokens = user.google_drive_tokens;
      if (typeof tokens === "string") {
        try {
          tokens = JSON.parse(tokens);
        } catch {
          tokens = null;
        }
      }
      if (tokens?.access_token) {
        try {
          const oauth2Client = this.getOAuth2Client();
          await oauth2Client.revokeToken(tokens.access_token);
        } catch (err) {
          console.warn("Revoke token warning:", err);
        }
      }
    }
    await db.updateGoogleTokens(userId, null);
  }
};

// src/routes/drive.routes.ts
var router2 = (0, import_express2.Router)();
router2.get("/auth-url", requireAuth, (req, res) => {
  try {
    const authUrl = GoogleDriveService.getAuthUrl(req.user.userId);
    res.json({ url: authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to generate Google Drive authorization URL" });
  }
});
router2.get("/callback", async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state;
  if (!code || !userId) {
    return res.status(400).send("Authorization failed: Missing code or state.");
  }
  try {
    await GoogleDriveService.handleOAuthCallback(code, userId);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/settings?drive_connected=true`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/settings?drive_error=${encodeURIComponent(err.message || "OAuth error")}`);
  }
});
router2.get("/status", requireAuth, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const profile = AuthService.toUserProfile(user);
    res.json({
      connected: profile.driveConnected,
      email: profile.driveEmail
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.post("/disconnect", requireAuth, async (req, res) => {
  try {
    await GoogleDriveService.disconnect(req.user.userId);
    res.json({ message: "Google Drive disconnected successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.post("/backup", requireAuth, async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: "Filename and content are required" });
    }
    const result = await GoogleDriveService.uploadBackup(
      req.user.userId,
      filename,
      typeof content === "string" ? content : JSON.stringify(content)
    );
    res.json({
      success: true,
      file: result,
      message: "Backup uploaded directly to your Google Drive."
    });
  } catch (err) {
    console.error("Drive upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload backup to Google Drive" });
  }
});
router2.get("/backups", requireAuth, async (req, res) => {
  try {
    const backups = await GoogleDriveService.listBackups(req.user.userId);
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to list backups" });
  }
});
router2.get("/backup/:fileId", requireAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const content = await GoogleDriveService.downloadBackup(req.user.userId, fileId);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to download backup" });
  }
});
var drive_routes_default = router2;

// src/server.ts
import_dotenv.default.config({ path: import_path2.default.resolve(process.cwd(), ".env.local") });
import_dotenv.default.config({ path: import_path2.default.resolve(process.cwd(), ".env") });
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../.env.local") });
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../.env") });
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../../.env.local") });
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../../.env") });
var app = (0, import_express3.default)();
var PORT = process.env.PORT || 3001;
var CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use((0, import_helmet.default)({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, import_cors.default)({
  origin: (origin, callback) => {
    if (!origin || origin === CLIENT_URL || origin.includes("localhost") || origin.includes("127.0.0.1") || /^http:\/\/(192\.168|10|172\.(1[6-9]|2[0-9]|3[0-1]))\.\d+\.\d+(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
var authLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 mins
  max: 100,
  // 100 requests per 15 min window
  message: { error: "Too many authentication attempts, please try again later." }
});
app.use((0, import_cookie_parser.default)());
app.use(import_express3.default.json({ limit: "15mb" }));
app.use(import_express3.default.urlencoded({ extended: true, limit: "15mb" }));
app.get(["/spendwise.apk", "/api/download/apk"], (req, res) => {
  const possiblePaths = [
    import_path2.default.resolve(__dirname, "../../client/public/spendwise.apk"),
    import_path2.default.resolve(__dirname, "../../client/dist/spendwise.apk"),
    import_path2.default.resolve(process.cwd(), "client/public/spendwise.apk"),
    import_path2.default.resolve(process.cwd(), "client/dist/spendwise.apk")
  ];
  const apkPath = possiblePaths.find((p) => import_fs2.default.existsSync(p));
  if (!apkPath) {
    return res.status(404).json({ error: "APK file not found." });
  }
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", 'attachment; filename="SpendWise.apk"');
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(apkPath);
});
var dbInitPromise = null;
app.use(async (req, res, next) => {
  if (!dbInitPromise) {
    dbInitPromise = db.initialize().catch((err) => {
      console.error("Error during database initialization:", err);
    });
  }
  await dbInitPromise;
  next();
});
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "SpendWise Authentication API",
    neonConnected: !db.getIsFallback(),
    privacyNote: "Zero financial data is stored in the database. Only credentials and auth sessions are managed here."
  });
});
app.use(["/api/auth", "/auth"], authLimiter, auth_routes_default);
app.use(["/api/drive", "/drive"], drive_routes_default);
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\u{1F680} SpendWise Backend running on port ${PORT}`);
    console.log(`\u{1F512} Privacy Architecture: Database holds auth credentials only.`);
  });
  db.initialize().catch((err) => console.error("Error during initial DB connect:", err));
}
var server_default = app;
if (typeof module !== "undefined" && module.exports) {
  module.exports = app;
  module.exports.default = app;
}
