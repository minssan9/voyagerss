import * as bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface PasswordPolicy {
  minLength: number
  maxLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  minSpecialChars: number
  preventCommonPasswords: boolean
  preventUserInfo: boolean
  preventReuse: number // Number of previous passwords to check
  maxAge: number // Days before password must be changed
  lockoutThreshold: number // Failed attempts before lockout
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'ENTERPRISE'
}

export interface PasswordValidationResult {
  valid: boolean
  score: number // 0-100 strength score
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export interface PasswordHistoryEntry {
  hash: string
  createdAt: Date
}

/**
 * Password Policy Enforcement Service
 * Implements enterprise-grade password security policies
 */
export class PasswordPolicyService {
  // Default password policies by complexity level
  private static readonly POLICIES: Record<string, PasswordPolicy> = {
    LOW: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      minSpecialChars: 0,
      preventCommonPasswords: true,
      preventUserInfo: true,
      preventReuse: 3,
      maxAge: 180, // 6 months
      lockoutThreshold: 10,
      complexity: 'LOW'
    },
    MEDIUM: {
      minLength: 10,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minSpecialChars: 1,
      preventCommonPasswords: true,
      preventUserInfo: true,
      preventReuse: 5,
      maxAge: 90, // 3 months
      lockoutThreshold: 8,
      complexity: 'MEDIUM'
    },
    HIGH: {
      minLength: 12,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minSpecialChars: 2,
      preventCommonPasswords: true,
      preventUserInfo: true,
      preventReuse: 8,
      maxAge: 60, // 2 months
      lockoutThreshold: 5,
      complexity: 'HIGH'
    },
    ENTERPRISE: {
      minLength: 14,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minSpecialChars: 3,
      preventCommonPasswords: true,
      preventUserInfo: true,
      preventReuse: 12,
      maxAge: 30, // 1 month
      lockoutThreshold: 3,
      complexity: 'ENTERPRISE'
    }
  }

  // Common passwords to prevent (top 100 most common)
  private static readonly COMMON_PASSWORDS = new Set([
    'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
    'password1', 'admin', 'letmein', 'welcome', 'monkey', 'dragon',
    'master', 'hello', 'login', 'pass', 'administrator', 'root',
    'system', 'guest', 'user', 'test', 'demo', 'temp', 'default',
    'changeme', 'newpass', 'secret', 'private', 'confidential',
    '1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'iloveyou',
    'sunshine', 'princess', 'football', 'baseball', 'basketball',
    'superman', 'batman', 'spiderman', 'starwars', 'pokemon'
  ])

  // Special characters for password validation
  private static readonly SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  /**
   * Get password policy by complexity level
   */
  static getPolicy(complexity: string = 'MEDIUM'): PasswordPolicy {
    const policy = this.POLICIES[complexity]
    return policy || this.POLICIES.MEDIUM!
  }

  /**
   * Set custom password policy in database
   */
  static async setCustomPolicy(policy: Partial<PasswordPolicy>): Promise<void> {
    try {
      const policyJson = JSON.stringify(policy)
      
      await prisma.securityConfig.upsert({
        where: { key: 'password_policy' },
        update: { value: policyJson },
        create: {
          key: 'password_policy',
          value: policyJson,
          description: 'Custom password policy configuration'
        }
      })
    } catch (error) {
      console.error('[PasswordPolicyService] Set custom policy error:', error)
    }
  }

  /**
   * Get current password policy from database or default
   */
  static async getCurrentPolicy(): Promise<PasswordPolicy> {
    try {
      const config = await prisma.securityConfig.findUnique({
        where: { key: 'password_policy' }
      })

      if (config) {
        const customPolicy = JSON.parse(config.value)
        return { ...this.POLICIES.MEDIUM, ...customPolicy }
      }

      return this.POLICIES.MEDIUM!
    } catch (error) {
      console.error('[PasswordPolicyService] Get current policy error:', error)
      return this.POLICIES.MEDIUM!
    }
  }

  /**
   * Validate password against policy
   */
  static async validatePassword(
    password: string,
    userInfo?: {
      username?: string
      email?: string
      firstName?: string
      lastName?: string
    },
    customPolicy?: PasswordPolicy
  ): Promise<PasswordValidationResult> {
    const policy = customPolicy || await this.getCurrentPolicy()
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    let score = 0

    // Basic length validation
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`)
    } else {
      score += Math.min(20, (password.length - policy.minLength) * 2)
    }

    if (password.length > policy.maxLength) {
      errors.push(`Password must not exceed ${policy.maxLength} characters`)
    }

    // Character requirements
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const specialCharCount = (password.match(new RegExp(`[${this.escapeRegex(this.SPECIAL_CHARS)}]`, 'g')) || []).length

    if (policy.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter')
    } else if (hasUppercase) {
      score += 10
    }

    if (policy.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter')
    } else if (hasLowercase) {
      score += 10
    }

    if (policy.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number')
    } else if (hasNumbers) {
      score += 10
    }

    if (policy.requireSpecialChars && specialCharCount < policy.minSpecialChars) {
      errors.push(`Password must contain at least ${policy.minSpecialChars} special character(s): ${this.SPECIAL_CHARS}`)
    } else if (specialCharCount >= policy.minSpecialChars) {
      score += Math.min(15, specialCharCount * 5)
    }

    // Complexity checks
    const uniqueChars = new Set(password).size
    if (uniqueChars < 6) {
      warnings.push('Password should use more diverse characters')
    } else {
      score += Math.min(15, uniqueChars)
    }

    // Pattern checks
    if (/(.)\1{2,}/.test(password)) {
      warnings.push('Avoid repeating characters')
      score -= 10
    }

    if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/.test(password.toLowerCase())) {
      warnings.push('Avoid sequential characters')
      score -= 5
    }

    if (/^(.+)\1+$/.test(password)) {
      warnings.push('Avoid repeating patterns')
      score -= 15
    }

    // Common password check
    if (policy.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase()
      if (this.COMMON_PASSWORDS.has(lowerPassword)) {
        errors.push('Password is too common and easily guessable')
      }

      // Check for common password patterns
      if (/^password\d*$/i.test(password) || /^\d+$/.test(password) || /^[a-z]+$/i.test(password)) {
        warnings.push('Password follows a common pattern')
        score -= 20
      }
    }

    // User info check
    if (policy.preventUserInfo && userInfo) {
      const userValues = [
        userInfo.username,
        userInfo.email?.split('@')[0],
        userInfo.firstName,
        userInfo.lastName
      ].filter(Boolean).map(v => v!.toLowerCase())

      for (const value of userValues) {
        if (password.toLowerCase().includes(value)) {
          errors.push('Password must not contain personal information')
          break
        }
      }
    }

    // Generate suggestions
    if (errors.length > 0) {
      suggestions.push('Fix the above errors to meet password requirements')
    }

    if (score < 50) {
      suggestions.push('Consider using a longer password with more character variety')
    }

    if (score < 30) {
      suggestions.push('Use a mix of uppercase, lowercase, numbers, and special characters')
    }

    if (!password.includes(' ') && policy.minLength >= 12) {
      suggestions.push('Consider using a passphrase with spaces for better security and memorability')
    }

    // Cap score at 100
    score = Math.min(100, Math.max(0, score))

    return {
      valid: errors.length === 0,
      score,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Hash password with salt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12 // Higher than default for better security
    return await bcrypt.hash(password, saltRounds)
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  /**
   * Check if password can be reused (not in history)
   */
  static async canReusePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const policy = await this.getCurrentPolicy()
      
      if (policy.preventReuse === 0) {
        return true // No reuse restriction
      }

      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
      })

      if (!user) {
        return true
      }

      // Check current password
      const isSameAsCurrent = await this.verifyPassword(newPassword, user.passwordHash)
      if (isSameAsCurrent) {
        return false
      }

      // TODO: Implement password history tracking
      // For now, just check against current password
      return true
    } catch (error) {
      console.error('[PasswordPolicyService] Check password reuse error:', error)
      return true // Allow if check fails
    }
  }

  /**
   * Check if password needs to be changed (age check)
   */
  static async needsPasswordChange(userId: string): Promise<{
    needsChange: boolean
    daysUntilExpiry: number
    expired: boolean
  }> {
    try {
      const policy = await this.getCurrentPolicy()
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: {
          passwordChangedAt: true,
          mustChangePassword: true
        }
      })

      if (!user) {
        return { needsChange: true, daysUntilExpiry: 0, expired: true }
      }

      // Force change if flagged
      if (user.mustChangePassword) {
        return { needsChange: true, daysUntilExpiry: 0, expired: true }
      }

      const passwordAge = Date.now() - user.passwordChangedAt.getTime()
      const passwordAgeDays = Math.floor(passwordAge / (1000 * 60 * 60 * 24))
      const daysUntilExpiry = policy.maxAge - passwordAgeDays

      return {
        needsChange: daysUntilExpiry <= 0,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        expired: daysUntilExpiry <= 0
      }
    } catch (error) {
      console.error('[PasswordPolicyService] Check password age error:', error)
      return { needsChange: false, daysUntilExpiry: 30, expired: false }
    }
  }

  /**
   * Generate secure password suggestion
   */
  static generateSecurePassword(length: number = 16, includeSymbols: boolean = true): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = includeSymbols ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : ''

    let charset = lowercase + uppercase + numbers + symbols
    let password = ''

    // Ensure at least one character from each required set
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    
    if (includeSymbols) {
      password += symbols[Math.floor(Math.random() * symbols.length)]
    }

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Generate password strength meter data
   */
  static getPasswordStrengthMeter(score: number): {
    level: string
    color: string
    percentage: number
    description: string
  } {
    if (score >= 80) {
      return {
        level: 'Very Strong',
        color: '#28a745', // Green
        percentage: 100,
        description: 'Excellent password security'
      }
    } else if (score >= 60) {
      return {
        level: 'Strong',
        color: '#20c997', // Teal
        percentage: 80,
        description: 'Good password security'
      }
    } else if (score >= 40) {
      return {
        level: 'Medium',
        color: '#ffc107', // Yellow
        percentage: 60,
        description: 'Moderate password security'
      }
    } else if (score >= 20) {
      return {
        level: 'Weak',
        color: '#fd7e14', // Orange
        percentage: 40,
        description: 'Weak password security'
      }
    } else {
      return {
        level: 'Very Weak',
        color: '#dc3545', // Red
        percentage: 20,
        description: 'Very poor password security'
      }
    }
  }

  /**
   * Escape special characters for regex
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Update user password with policy validation
   */
  static async updateUserPassword(
    userId: string,
    newPassword: string,
    userInfo?: { username?: string; email?: string; firstName?: string; lastName?: string }
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      // Validate new password
      const validation = await this.validatePassword(newPassword, userInfo)
      
      if (!validation.valid) {
        return { success: false, errors: validation.errors }
      }

      // Check if password can be reused
      const canReuse = await this.canReusePassword(userId, newPassword)
      if (!canReuse) {
        return { success: false, errors: ['Password has been used recently and cannot be reused'] }
      }

      // Hash and update password
      const hashedPassword = await this.hashPassword(newPassword)
      
      await prisma.adminUser.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedAttempts: 0 // Reset failed attempts on successful password change
        }
      })

      return { success: true, errors: [] }
    } catch (error) {
      console.error('[PasswordPolicyService] Update user password error:', error)
      return { success: false, errors: ['Failed to update password'] }
    }
  }
}

export default PasswordPolicyService