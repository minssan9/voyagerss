import * as crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface MfaSecret {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
  backupCodes: string[]
}

export interface MfaVerificationResult {
  valid: boolean
  backupCodeUsed?: boolean
  remainingBackupCodes?: number
  error?: string
}

export interface MfaStatus {
  enabled: boolean
  secret?: string
  backupCodesCount: number
  lastUsed?: Date
}

/**
 * Multi-Factor Authentication Service
 * Provides TOTP (Time-based One-Time Password) and backup code functionality
 */
export class MfaService {
  private static readonly APP_NAME = 'K-FG Index Admin'
  private static readonly ISSUER = 'kospi-fg-index.com'
  private static readonly WINDOW_SIZE = 1 // Allow 1 window tolerance (30s before/after)
  private static readonly BACKUP_CODE_COUNT = 8
  private static readonly BACKUP_CODE_LENGTH = 8

  /**
   * Generate MFA secret and setup data for a user
   */
  static async generateMfaSecret(userId: string, username: string): Promise<MfaSecret> {
    try {
      // Generate a random secret (32 characters, base32 compatible)
      const secret = this.generateRandomSecret()
      
      // Create QR code URL for easy setup
      const qrCodeUrl = this.generateQrCodeUrl(username, secret)
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes()
      
      // Encrypt backup codes before storing
      const encryptedBackupCodes = backupCodes.map(code => this.encryptBackupCode(code))

      // Store in database (not enabled yet)
      await prisma.adminUser.update({
        where: { id: userId },
        data: {
          mfaSecret: secret,
          mfaBackupCodes: JSON.stringify(encryptedBackupCodes),
          mfaEnabled: false // User must verify setup first
        }
      })

      return {
        secret,
        qrCodeUrl,
        manualEntryKey: this.formatSecretForManualEntry(secret),
        backupCodes
      }
    } catch (error) {
      console.error('[MfaService] Generate MFA secret error:', error)
      throw new Error('Failed to generate MFA secret')
    }
  }

  /**
   * Verify MFA setup by checking the TOTP code
   */
  static async verifyMfaSetup(userId: string, token: string): Promise<boolean> {
    try {
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: { mfaSecret: true, mfaEnabled: true }
      })

      if (!user || !user.mfaSecret) {
        return false
      }

      // Don't allow verification if already enabled
      if (user.mfaEnabled) {
        return false
      }

      // Verify the TOTP token
      const isValid = this.verifyTotpToken(user.mfaSecret, token)

      if (isValid) {
        // Enable MFA for the user
        await prisma.adminUser.update({
          where: { id: userId },
          data: { mfaEnabled: true }
        })

        // Log the MFA enablement
        await prisma.adminAuditLog.create({
          data: {
            userId,
            action: 'MFA_ENABLED',
            details: JSON.stringify({ method: 'TOTP' }),
            ipAddress: '127.0.0.1', // System action
            success: true,
            riskLevel: 'MEDIUM'
          }
        })
      }

      return isValid
    } catch (error) {
      console.error('[MfaService] Verify MFA setup error:', error)
      return false
    }
  }

  /**
   * Verify MFA token during login
   */
  static async verifyMfaToken(userId: string, token: string): Promise<MfaVerificationResult> {
    try {
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: {
          mfaEnabled: true,
          mfaSecret: true,
          mfaBackupCodes: true
        }
      })

      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        return { valid: false, error: 'MFA not enabled for user' }
      }

      // First try TOTP verification
      if (this.verifyTotpToken(user.mfaSecret, token)) {
        return { valid: true }
      }

      // If TOTP fails, try backup codes
      const backupResult = await this.verifyBackupCode(userId, token)
      if (backupResult.valid) {
        const result: MfaVerificationResult = {
          valid: true,
          backupCodeUsed: true
        }
        if (backupResult.remainingCodes !== undefined) {
          result.remainingBackupCodes = backupResult.remainingCodes
        }
        return result
      }

      return { valid: false, error: 'Invalid MFA token' }
    } catch (error) {
      console.error('[MfaService] Verify MFA token error:', error)
      return { valid: false, error: 'MFA verification failed' }
    }
  }

  /**
   * Disable MFA for a user
   */
  static async disableMfa(userId: string): Promise<boolean> {
    try {
      await prisma.adminUser.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: JSON.stringify([])
        }
      })

      // Log the MFA disablement
      await prisma.adminAuditLog.create({
        data: {
          userId,
          action: 'MFA_DISABLED',
          details: JSON.stringify({ reason: 'User requested' }),
          ipAddress: '127.0.0.1', // System action
          success: true,
          riskLevel: 'MEDIUM'
        }
      })

      return true
    } catch (error) {
      console.error('[MfaService] Disable MFA error:', error)
      return false
    }
  }

  /**
   * Get MFA status for a user
   */
  static async getMfaStatus(userId: string): Promise<MfaStatus> {
    try {
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: {
          mfaEnabled: true,
          mfaSecret: true,
          mfaBackupCodes: true
        }
      })

      if (!user) {
        return { enabled: false, backupCodesCount: 0 }
      }

      let backupCodesCount = 0
      try {
        const backupCodes = JSON.parse(user.mfaBackupCodes || '[]')
        backupCodesCount = Array.isArray(backupCodes) ? backupCodes.length : 0
      } catch {
        backupCodesCount = 0
      }

      const result: MfaStatus = {
        enabled: user.mfaEnabled,
        backupCodesCount
      }

      if (user.mfaSecret) {
        result.secret = user.mfaSecret
      }

      return result
    } catch (error) {
      console.error('[MfaService] Get MFA status error:', error)
      return { enabled: false, backupCodesCount: 0 }
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes()
      const encryptedBackupCodes = backupCodes.map(code => this.encryptBackupCode(code))

      await prisma.adminUser.update({
        where: { id: userId },
        data: { mfaBackupCodes: JSON.stringify(encryptedBackupCodes) }
      })

      // Log backup code regeneration
      await prisma.adminAuditLog.create({
        data: {
          userId,
          action: 'MFA_BACKUP_CODES_REGENERATED',
          details: JSON.stringify({ count: backupCodes.length }),
          ipAddress: '127.0.0.1', // System action
          success: true,
          riskLevel: 'LOW'
        }
      })

      return backupCodes
    } catch (error) {
      console.error('[MfaService] Generate new backup codes error:', error)
      throw new Error('Failed to generate new backup codes')
    }
  }

  /**
   * Generate a random secret for TOTP
   */
  private static generateRandomSecret(): string {
    // Generate 20 random bytes and encode as base32
    const buffer = crypto.randomBytes(20)
    return this.base32Encode(buffer)
  }

  /**
   * Generate QR code URL for TOTP setup
   */
  private static generateQrCodeUrl(username: string, secret: string): string {
    const label = encodeURIComponent(`${this.APP_NAME}:${username}`)
    const issuer = encodeURIComponent(this.ISSUER)
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
    
    // Return Google Charts QR code URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
  }

  /**
   * Format secret for manual entry (with spaces for readability)
   */
  private static formatSecretForManualEntry(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret
  }

  /**
   * Verify TOTP token
   */
  private static verifyTotpToken(secret: string, token: string): boolean {
    try {
      const currentTime = Math.floor(Date.now() / 1000)
      const window = Math.floor(currentTime / 30) // 30-second window

      // Check current window and adjacent windows for tolerance
      for (let i = -this.WINDOW_SIZE; i <= this.WINDOW_SIZE; i++) {
        const timeWindow = window + i
        const expectedToken = this.generateTotpToken(secret, timeWindow)
        
        if (expectedToken === token) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('[MfaService] Verify TOTP token error:', error)
      return false
    }
  }

  /**
   * Generate TOTP token for a specific time window
   */
  private static generateTotpToken(secret: string, timeWindow: number): string {
    try {
      // Decode base32 secret
      const key = this.base32Decode(secret)
      
      // Convert time window to 8-byte buffer (big-endian)
      const timeBuffer = Buffer.alloc(8)
      timeBuffer.writeUInt32BE(Math.floor(timeWindow / 0x100000000), 0)
      timeBuffer.writeUInt32BE(timeWindow & 0xffffffff, 4)

      // Generate HMAC-SHA1
      const hmac = crypto.createHmac('sha1', key)
      hmac.update(timeBuffer)
      const digest = hmac.digest()

      // Dynamic truncation
      const offset = digest[digest.length - 1]! & 0xf
      const code = ((digest[offset]! & 0x7f) << 24) |
                   ((digest[offset + 1]! & 0xff) << 16) |
                   ((digest[offset + 2]! & 0xff) << 8) |
                   (digest[offset + 3]! & 0xff)

      // Return 6-digit code
      return (code % 1000000).toString().padStart(6, '0')
    } catch (error) {
      console.error('[MfaService] Generate TOTP token error:', error)
      return ''
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = []
    
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      // Generate random alphanumeric code
      const code = crypto.randomBytes(this.BACKUP_CODE_LENGTH / 2)
        .toString('hex')
        .toLowerCase()
        .match(/.{1,4}/g)
        ?.join('-') || ''
      
      codes.push(code)
    }

    return codes
  }

  /**
   * Encrypt backup code for storage
   */
  private static encryptBackupCode(code: string): string {
    // Simple encryption for backup codes (in production, use proper encryption)
    const cipher = crypto.createCipher('aes-256-cbc', process.env.MFA_ENCRYPTION_KEY || 'default-key-change-in-production')
    let encrypted = cipher.update(code, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  /**
   * Decrypt backup code from storage
   */
  private static decryptBackupCode(encryptedCode: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', process.env.MFA_ENCRYPTION_KEY || 'default-key-change-in-production')
      let decrypted = decipher.update(encryptedCode, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      console.error('[MfaService] Decrypt backup code error:', error)
      return ''
    }
  }

  /**
   * Verify backup code and mark as used
   */
  private static async verifyBackupCode(userId: string, code: string): Promise<{
    valid: boolean
    remainingCodes?: number
  }> {
    try {
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: { mfaBackupCodes: true }
      })

      if (!user || !user.mfaBackupCodes) {
        return { valid: false }
      }

      const encryptedBackupCodes = JSON.parse(user.mfaBackupCodes)

      // Check if any backup code matches
      let foundIndex = -1
      for (let i = 0; i < encryptedBackupCodes.length; i++) {
        const decryptedCode = this.decryptBackupCode(encryptedBackupCodes[i])
        if (decryptedCode === code) {
          foundIndex = i
          break
        }
      }

      if (foundIndex === -1) {
        return { valid: false }
      }

      // Remove the used backup code
      const updatedBackupCodes = [...encryptedBackupCodes]
      updatedBackupCodes.splice(foundIndex, 1)

      await prisma.adminUser.update({
        where: { id: userId },
        data: { mfaBackupCodes: JSON.stringify(updatedBackupCodes) }
      })

      // Log backup code usage
      await prisma.adminAuditLog.create({
        data: {
          userId,
          action: 'MFA_BACKUP_CODE_USED',
          details: JSON.stringify({ remainingCodes: updatedBackupCodes.length }),
          ipAddress: '127.0.0.1', // System action
          success: true,
          riskLevel: 'LOW'
        }
      })

      return {
        valid: true,
        remainingCodes: updatedBackupCodes.length
      }
    } catch (error) {
      console.error('[MfaService] Verify backup code error:', error)
      return { valid: false }
    }
  }

  /**
   * Base32 encoding (simplified implementation)
   */
  private static base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let result = ''
    let bits = 0
    let value = 0

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i]!
      bits += 8

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31]
        bits -= 5
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31]
    }

    return result
  }

  /**
   * Base32 decoding (simplified implementation)
   */
  private static base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    const result: number[] = []
    let bits = 0
    let value = 0

    for (let i = 0; i < encoded.length; i++) {
      const char = encoded[i]!.toUpperCase()
      const index = alphabet.indexOf(char)
      
      if (index === -1) continue

      value = (value << 5) | index
      bits += 5

      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 255)
        bits -= 8
      }
    }

    return Buffer.from(result)
  }
}

export default MfaService