/**
 * Authentication service
 * Handles token generation, password hashing, and OAuth integration
 */

import { SignJWT, jwtVerify } from 'jose';
import { hash, verify } from 'argon2';
import { generateToken } from '../lib/crypto.js';
import type { Database } from '../db/index.js';
import type Redis from 'ioredis';
import { refreshTokens, users, workspaces } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  workspaceId: string;
  email: string;
  role: string;
}

export class AuthService {
  constructor(
    private db: Database,
    private redis: Redis,
    private jwtSecret: string,
    private accessTokenExpiry: string = '15m',
    private refreshTokenExpiry: string = '7d'
  ) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(userId: string, workspaceId: string, email: string, role: string): Promise<TokenPair> {
    const secret = new TextEncoder().encode(this.jwtSecret);
    const expiresIn = this.parseExpiry(this.accessTokenExpiry);

    const payload: TokenPayload = {
      userId,
      workspaceId,
      email,
      role,
    };

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${this.accessTokenExpiry}`)
      .sign(secret);

    const refreshTokenValue = generateToken(32);
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + this.parseExpiryDays(this.refreshTokenExpiry)
    );

    // Store refresh token in database
    await this.db.insert(refreshTokens).values({
      userId,
      workspaceId,
      token: refreshTokenValue,
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn,
    };
  }

  /**
   * Verify password with Argon2id
   */
  async verifyPassword(password: string, hash_: string): Promise<boolean> {
    try {
      return await verify(hash_);
    } catch {
      return false;
    }
  }

  /**
   * Hash password with Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      type: 2, // Argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle(googleIdToken: string): Promise<{ user: any; workspace: any; tokens: TokenPair }> {
    // TODO: Verify Google ID token and extract profile
    // This would involve:
    // 1. Verify the ID token with Google's public key
    // 2. Extract email and sub from token
    // 3. Find or create user
    // 4. Find or create workspace
    // 5. Generate tokens

    throw new Error('Not implemented yet');
  }

  /**
   * Create refresh token
   */
  async createRefreshToken(userId: string, workspaceId: string): Promise<string> {
    const token = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.parseExpiryDays(this.refreshTokenExpiry));

    await this.db.insert(refreshTokens).values({
      userId,
      workspaceId,
      token,
      expiresAt,
    });

    return token;
  }

  /**
   * Rotate refresh token
   */
  async rotateRefreshToken(oldToken: string, userId: string): Promise<string> {
    // Revoke old token
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.token, oldToken));

    // Create new token
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.createRefreshToken(userId, user.workspaceId);
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string; workspaceId: string } | null> {
    const refreshToken = await this.db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.revokedAt || refreshToken.expiresAt < new Date()) {
      return null;
    }

    return {
      userId: refreshToken.userId,
      workspaceId: refreshToken.workspaceId,
    };
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.token, token));
  }

  /**
   * Parse expiry string (e.g., "7d", "15m") into seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([dwh])/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 'd':
        return num * 24 * 60 * 60;
      case 'w':
        return num * 7 * 24 * 60 * 60;
      case 'h':
        return num * 60 * 60;
      case 'm':
        return num * 60;
      default:
        throw new Error('Invalid expiry unit');
    }
  }

  /**
   * Parse expiry string into days
   */
  private parseExpiryDays(expiry: string): number {
    const match = expiry.match(/^(\d+)([dwh])/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 'd':
        return num;
      case 'w':
        return num * 7;
      case 'h':
        return Math.ceil(num / 24);
      case 'm':
        return Math.ceil(num / (24 * 60));
      default:
        throw new Error('Invalid expiry unit');
    }
  }
}
