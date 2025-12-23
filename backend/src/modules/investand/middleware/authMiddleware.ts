import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcrypt'
import { PrismaClient, AdminRole } from '@prisma/client'

const prisma = new PrismaClient()

// Enhanced Admin user interface
export interface AdminUser {
  id: string
  username: string
  email?: string | undefined
  role: AdminRole
  permissions: string[]
  lastLogin?: Date | undefined
  mfaEnabled: boolean
  isActive: boolean
  isLocked: boolean
  mustChangePassword: boolean
}

// Extended Request interface for authenticated routes
export interface AuthenticatedRequest extends Request {
  admin?: AdminUser
}

// Authentication configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'


/**
 * Simple admin authentication middleware
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication token required.',
        code: 'MISSING_TOKEN'
      })
      return
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token not provided.',
        code: 'MISSING_TOKEN'
      })
      return
    }

    // Verify token using legacy function
    const user = verifyToken(token)

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      })
      return
    }

    // Get user from database to ensure current state
    prisma.adminUser.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        isLocked: true,
        lastLoginAt: true,
        mustChangePassword: true
      }
    }).then(dbUser => {
      if (!dbUser || !dbUser.isActive || dbUser.isLocked) {
        res.status(401).json({
          success: false,
          message: 'Account is not accessible.',
          code: 'ACCOUNT_INACCESSIBLE'
        })
        return
      }

      // Prepare user data for request
      const adminUser: AdminUser = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email || undefined,
        role: dbUser.role,
        permissions: JSON.parse(dbUser.permissions || '[]'),
        lastLogin: dbUser.lastLoginAt || undefined,
        mfaEnabled: false,
        isActive: dbUser.isActive,
        isLocked: dbUser.isLocked,
        mustChangePassword: dbUser.mustChangePassword
      }

      // Attach user to request
      req.admin = adminUser
      next()
    }).catch(error => {
      console.error('[Auth] Database error:', error)
      res.status(500).json({
        success: false,
        message: 'Authentication processing error.',
        code: 'AUTH_ERROR'
      })
    })
  } catch (error) {
    console.error('[Auth] Authentication middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Authentication processing error.',
      code: 'AUTH_ERROR'
    })
  }
}

/**
 * Simple permission checking
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Check permission
      const hasPermission = req.admin.role === 'SUPER_ADMIN' ||
                           req.admin.role === 'ADMIN' ||
                           req.admin.permissions.includes(permission)

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permission
        })
        return
      }

      next()
    } catch (error) {
      console.error('[Auth] Permission check error:', error)
      res.status(500).json({
        success: false,
        message: 'Permission check error.',
        code: 'PERMISSION_ERROR'
      })
    }
  }
}

/**
 * Simple admin role requirement
 */
export function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTHENTICATION_REQUIRED'
      })
      return
    }

    if (req.admin.role !== 'SUPER_ADMIN' && req.admin.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Admin role required.',
        code: 'ADMIN_ROLE_REQUIRED'
      })
      return
    }

    next()
  } catch (error) {
    console.error('[Auth] Admin role check error:', error)
    res.status(500).json({
      success: false,
      message: 'Admin role check error.',
      code: 'ROLE_CHECK_ERROR'
    })
  }
}


/**
 * Security headers middleware
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // Remove server information
  res.removeHeader('X-Powered-By')

  next()
}

/**
 * Legacy compatibility functions (deprecated)
 */
// Simple token generation
export function generateToken(user: AdminUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

// Simple token verification
export function verifyToken(token: string): AdminUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions || [],
      mfaEnabled: false,
      isActive: true,
      isLocked: false,
      mustChangePassword: false
    }
  } catch (error) {
    return null
  }
}
 
 

export default {
  // Simple functions
  requireAdmin,
  requirePermission,
  requireAdminRole,
  securityHeaders,
  generateToken,
  verifyToken
}