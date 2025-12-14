import { PrismaClient } from '@prisma/client'
import { Request } from 'express'
import { TokenService } from '@/services/auth/tokenService'

const prisma = new PrismaClient()

export interface SessionInfo {
  id: string
  sessionId: string
  userId: string
  ipAddress: string
  userAgent?: string | undefined
  isActive: boolean
  lastUsedAt: Date
  createdAt: Date
  expiresAt: Date
  location?: {
    country?: string
    city?: string
    timezone?: string
  } | undefined
  device?: {
    type?: string // desktop, mobile, tablet
    os?: string
    browser?: string
  } | undefined
}

export interface SessionStats {
  totalActiveSessions: number
  todayLogins: number
  uniqueIpsToday: number
  suspiciousActivity: number
}

/**
 * Session Management and Tracking Service
 * Handles session lifecycle, tracking, and security monitoring
 */
export class SessionService {
  /**
   * Get detailed session information
   */
  static async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    try {
      const session = await prisma.adminSession.findUnique({
        where: { sessionId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      })

      if (!session) {
        return null
      }

      return {
        id: session.id,
        sessionId: session.sessionId,
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent ?? undefined,
        isActive: session.isActive,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        device: this.parseUserAgent(session.userAgent),
        location: await this.getLocationInfo(session.ipAddress)
      }
    } catch (error) {
      console.error('[SessionService] Get session info error:', error)
      return null
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.adminSession.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          lastUsedAt: 'desc'
        }
      })

      const sessionInfos: SessionInfo[] = []
      
      for (const session of sessions) {
        const info: SessionInfo = {
          id: session.id,
          sessionId: session.sessionId,
          userId: session.userId,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent ?? undefined,
          isActive: session.isActive,
          lastUsedAt: session.lastUsedAt,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          device: this.parseUserAgent(session.userAgent),
          location: await this.getLocationInfo(session.ipAddress)
        }
        sessionInfos.push(info)
      }

      return sessionInfos
    } catch (error) {
      console.error('[SessionService] Get user sessions error:', error)
      return []
    }
  }

  /**
   * Get session statistics for dashboard
   */
  static async getSessionStats(): Promise<SessionStats> {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Total active sessions
      const totalActiveSessions = await prisma.adminSession.count({
        where: {
          isActive: true,
          expiresAt: {
            gt: now
          }
        }
      })

      // Today's logins
      const todayLogins = await prisma.adminSession.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      })

      // Unique IPs today
      const uniqueSessions = await prisma.adminSession.findMany({
        where: {
          createdAt: {
            gte: today
          }
        },
        select: {
          ipAddress: true
        },
        distinct: ['ipAddress']
      })

      // Suspicious activity (multiple failed attempts from same IP)
      const suspiciousActivity = await prisma.adminLoginAttempt.groupBy({
        by: ['ipAddress'],
        where: {
          success: false,
          attemptedAt: {
            gte: today
          }
        },
        having: {
          ipAddress: {
            _count: {
              gt: 3
            }
          }
        }
      })

      return {
        totalActiveSessions,
        todayLogins,
        uniqueIpsToday: uniqueSessions.length,
        suspiciousActivity: suspiciousActivity.length
      }
    } catch (error) {
      console.error('[SessionService] Get session stats error:', error)
      return {
        totalActiveSessions: 0,
        todayLogins: 0,
        uniqueIpsToday: 0,
        suspiciousActivity: 0
      }
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string, req: Request): Promise<void> {
    try {
      await prisma.adminSession.updateMany({
        where: {
          sessionId,
          isActive: true
        },
        data: {
          lastUsedAt: new Date(),
          ipAddress: TokenService.extractIpAddress(req) // Update IP if changed (mobile users)
        }
      })
    } catch (error) {
      console.error('[SessionService] Update session activity error:', error)
    }
  }

  /**
   * Detect concurrent sessions from different locations
   */
  static async detectConcurrentSessions(userId: string): Promise<{
    suspicious: boolean
    sessions: SessionInfo[]
    reason?: string
  }> {
    try {
      const sessions = await this.getUserActiveSessions(userId)
      
      if (sessions.length <= 1) {
        return { suspicious: false, sessions }
      }

      // Check for sessions from different countries
      const countries = new Set()
      const recentSessions = sessions.filter(s => 
        new Date().getTime() - s.lastUsedAt.getTime() < 30 * 60 * 1000 // 30 minutes
      )

      for (const session of recentSessions) {
        if (session.location?.country) {
          countries.add(session.location.country)
        }
      }

      if (countries.size > 1) {
        return {
          suspicious: true,
          sessions,
          reason: 'Sessions detected from multiple countries'
        }
      }

      // Check for unusual device patterns
      const devices = new Set()
      for (const session of recentSessions) {
        if (session.device?.type) {
          devices.add(session.device.type)
        }
      }

      if (devices.size > 2) {
        return {
          suspicious: true,
          sessions,
          reason: 'Sessions detected from multiple device types'
        }
      }

      return { suspicious: false, sessions }
    } catch (error) {
      console.error('[SessionService] Detect concurrent sessions error:', error)
      return { suspicious: false, sessions: [] }
    }
  }

  /**
   * Terminate session
   */
  static async terminateSession(sessionId: string, userId: string, reason: string): Promise<boolean> {
    try {
      // Log the termination
      await prisma.adminAuditLog.create({
        data: {
          userId,
          sessionId,
          action: 'SESSION_TERMINATED',
          details: JSON.stringify({ reason, terminatedAt: new Date() }),
          ipAddress: '127.0.0.1', // System action
          success: true,
          riskLevel: 'MEDIUM'
        }
      })

      // Revoke the session using TokenService
      return await TokenService.revokeSession(sessionId, userId)
    } catch (error) {
      console.error('[SessionService] Terminate session error:', error)
      return false
    }
  }

  /**
   * Parse user agent string to extract device information
   */
  private static parseUserAgent(userAgent?: string | null): SessionInfo['device'] {
    if (!userAgent) return undefined

    const device: SessionInfo['device'] = {}

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPad/.test(userAgent)) {
        device.type = 'tablet'
      } else {
        device.type = 'mobile'
      }
    } else {
      device.type = 'desktop'
    }

    // Detect OS
    if (/Windows/.test(userAgent)) {
      device.os = 'Windows'
    } else if (/Mac OS/.test(userAgent)) {
      device.os = 'macOS'
    } else if (/Linux/.test(userAgent)) {
      device.os = 'Linux'
    } else if (/Android/.test(userAgent)) {
      device.os = 'Android'
    } else if (/iOS/.test(userAgent)) {
      device.os = 'iOS'
    }

    // Detect browser
    if (/Chrome/.test(userAgent) && !/Edge/.test(userAgent)) {
      device.browser = 'Chrome'
    } else if (/Firefox/.test(userAgent)) {
      device.browser = 'Firefox'
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      device.browser = 'Safari'
    } else if (/Edge/.test(userAgent)) {
      device.browser = 'Edge'
    }

    return device
  }

  /**
   * Get location information from IP address
   * In production, integrate with a proper geolocation service
   */
  private static async getLocationInfo(ipAddress: string): Promise<SessionInfo['location']> {
    try {
      // For localhost/private IPs, return default
      if (ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
        return {
          country: 'Local',
          city: 'Local',
          timezone: 'Asia/Seoul'
        }
      }

      // TODO: Integrate with geolocation service like MaxMind GeoIP2 or IP2Location
      // For now, return placeholder data
      return {
        country: 'South Korea',
        city: 'Seoul',
        timezone: 'Asia/Seoul'
      }
    } catch (error) {
      console.error('[SessionService] Get location info error:', error)
      return undefined
    }
  }

  /**
   * Check for session hijacking indicators
   */
  static async checkSessionSecurity(sessionId: string, req: Request): Promise<{
    secure: boolean
    warnings: string[]
  }> {
    try {
      const session = await prisma.adminSession.findUnique({
        where: { sessionId }
      })

      if (!session) {
        return { secure: false, warnings: ['Session not found'] }
      }

      const warnings: string[] = []
      const currentIp = TokenService.extractIpAddress(req)
      const currentUserAgent = TokenService.extractUserAgent(req)

      // Check IP address consistency (allow some flexibility for mobile users)
      if (session.ipAddress !== currentIp) {
        const lastChangeTime = new Date().getTime() - session.lastUsedAt.getTime()
        if (lastChangeTime < 5 * 60 * 1000) { // 5 minutes
          warnings.push('IP address changed rapidly')
        }
      }

      // Check user agent consistency
      if (session.userAgent && session.userAgent !== currentUserAgent) {
        warnings.push('User agent changed during session')
      }

      // Check session age
      const sessionAge = new Date().getTime() - session.createdAt.getTime()
      const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours
      if (sessionAge > maxSessionAge) {
        warnings.push('Session is very old')
      }

      return {
        secure: warnings.length === 0,
        warnings
      }
    } catch (error) {
      console.error('[SessionService] Check session security error:', error)
      return { secure: false, warnings: ['Security check failed'] }
    }
  }

  /**
   * Cleanup inactive sessions
   */
  static async cleanupInactiveSessions(): Promise<void> {
    try {
      const inactiveThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days

      // Deactivate very old sessions
      await prisma.adminSession.updateMany({
        where: {
          lastUsedAt: {
            lt: inactiveThreshold
          },
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      console.log('[SessionService] Inactive sessions cleanup completed')
    } catch (error) {
      console.error('[SessionService] Cleanup inactive sessions error:', error)
    }
  }
}

export default SessionService