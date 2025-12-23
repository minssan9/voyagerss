import * as jwt from 'jsonwebtoken'
import * as crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { Request } from 'express'

const prisma = new PrismaClient()

// Configuration
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production'
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'

export interface TokenPayload {
  userId: string
  username: string
  role: string
  permissions: string[]
  sessionId: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  sessionId: string
  expiresAt: Date
  refreshExpiresAt: Date
}

export interface TokenValidationResult {
  valid: boolean
  payload?: TokenPayload
  expired?: boolean
  error?: string
}

/**
 * Advanced JWT Token Management Service
 * Handles access tokens, refresh tokens, and session management
 */
export class TokenService {
  /**
   * Generate access and refresh token pair
   */
  static async generateTokenPair(
    userId: string,
    username: string,
    role: string,
    permissions: string[],
    ipAddress: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const sessionId = crypto.randomUUID()
    
    // Create token payload
    const payload: TokenPayload = {
      userId,
      username,
      role,
      permissions,
      sessionId
    }

    // Generate tokens
    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'kospi-fg-index',
      audience: 'admin-panel'
    } as jwt.SignOptions)

    const refreshToken = jwt.sign(
      { userId, sessionId, type: 'refresh' },
      JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'kospi-fg-index',
        audience: 'admin-panel'
      } as jwt.SignOptions
    )

    // Calculate expiry dates
    const accessTokenDecoded = jwt.decode(accessToken) as any
    const refreshTokenDecoded = jwt.decode(refreshToken) as any
    
    const expiresAt = new Date(accessTokenDecoded.exp * 1000)
    const refreshExpiresAt = new Date(refreshTokenDecoded.exp * 1000)

    // Store session in database
    await prisma.adminSession.create({
      data: {
        userId,
        sessionId,
        accessToken,
        ipAddress,
        userAgent: userAgent || null,
        expiresAt,
        isActive: true
      }
    })

    // Store refresh token in database
    await prisma.adminRefreshToken.create({
      data: {
        userId,
        token: refreshToken,
        sessionId,
        expiresAt: refreshExpiresAt
      }
    })

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresAt,
      refreshExpiresAt
    }
  }

  /**
   * Validate access token
   */
  static async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      // Verify JWT signature and expiry
      const payload = jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload
      
      // Check if session exists and is active
      const session = await prisma.adminSession.findFirst({
        where: {
          accessToken: token,
          sessionId: payload.sessionId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: true
        }
      })

      if (!session) {
        return { valid: false, error: 'Session not found or expired' }
      }

      // Check if user is still active
      if (!session.user.isActive || session.user.isLocked) {
        return { valid: false, error: 'User account is inactive or locked' }
      }

      // Update last used timestamp
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() }
      })

      return { valid: true, payload }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, expired: true, error: 'Token expired' }
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' }
      } else {
        console.error('[TokenService] Token validation error:', error)
        return { valid: false, error: 'Token validation failed' }
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string, ipAddress: string): Promise<TokenPair | null> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      // Find refresh token in database
      const storedRefreshToken = await prisma.adminRefreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          sessionId: payload.sessionId,
          isRevoked: false,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: {
            include: {
              sessions: {
                where: {
                  sessionId: payload.sessionId,
                  isActive: true
                }
              }
            }
          }
        }
      })

      if (!storedRefreshToken || !storedRefreshToken.user.isActive || storedRefreshToken.user.isLocked) {
        return null
      }

      const session = storedRefreshToken.user.sessions[0]
      if (!session) {
        return null
      }

      // Revoke old refresh token
      await prisma.adminRefreshToken.update({
        where: { id: storedRefreshToken.id },
        data: { isRevoked: true, revokedAt: new Date() }
      })

      // Generate new token pair
      const newTokenPair = await this.generateTokenPair(
        storedRefreshToken.user.id,
        storedRefreshToken.user.username,
        storedRefreshToken.user.role,
        JSON.parse(storedRefreshToken.user.permissions || '[]'),
        ipAddress,
        session.userAgent || undefined
      )

      // Deactivate old session
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { isActive: false }
      })

      return newTokenPair
    } catch (error) {
      console.error('[TokenService] Refresh token error:', error)
      return null
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      const payload = jwt.decode(refreshToken) as any
      if (!payload || payload.type !== 'refresh') {
        return false
      }

      // Revoke refresh token
      await prisma.adminRefreshToken.updateMany({
        where: {
          token: refreshToken,
          sessionId: payload.sessionId,
          isRevoked: false
        },
        data: {
          isRevoked: true,
          revokedAt: new Date()
        }
      })

      // Deactivate session
      await prisma.adminSession.updateMany({
        where: {
          sessionId: payload.sessionId,
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      return true
    } catch (error) {
      console.error('[TokenService] Revoke token error:', error)
      return false
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  static async revokeAllUserTokens(userId: string): Promise<boolean> {
    try {
      // Revoke all refresh tokens
      await prisma.adminRefreshToken.updateMany({
        where: {
          userId,
          isRevoked: false
        },
        data: {
          isRevoked: true,
          revokedAt: new Date()
        }
      })

      // Deactivate all sessions
      await prisma.adminSession.updateMany({
        where: {
          userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      return true
    } catch (error) {
      console.error('[TokenService] Revoke all tokens error:', error)
      return false
    }
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    const sessions = await prisma.adminSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        sessionId: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: {
        lastUsedAt: 'desc'
      }
    })

    return sessions
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Revoke refresh tokens for this session
      await prisma.adminRefreshToken.updateMany({
        where: {
          sessionId,
          userId,
          isRevoked: false
        },
        data: {
          isRevoked: true,
          revokedAt: new Date()
        }
      })

      // Deactivate session
      await prisma.adminSession.updateMany({
        where: {
          sessionId,
          userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      return true
    } catch (error) {
      console.error('[TokenService] Revoke session error:', error)
      return false
    }
  }

  /**
   * Clean up expired tokens and sessions
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date()

      // Deactivate expired sessions
      await prisma.adminSession.updateMany({
        where: {
          expiresAt: {
            lt: now
          },
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      // Auto-revoke expired refresh tokens
      await prisma.adminRefreshToken.updateMany({
        where: {
          expiresAt: {
            lt: now
          },
          isRevoked: false
        },
        data: {
          isRevoked: true,
          revokedAt: now
        }
      })

      console.log('[TokenService] Expired tokens cleanup completed')
    } catch (error) {
      console.error('[TokenService] Cleanup error:', error)
    }
  }

  /**
   * Extract IP address from request
   */
  static extractIpAddress(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    )
  }

  /**
   * Extract user agent from request
   */
  static extractUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'Unknown'
  }
}

export default TokenService