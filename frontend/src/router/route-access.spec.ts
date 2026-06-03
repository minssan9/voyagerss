import { describe, it, expect, beforeEach } from 'vitest'
import {
  decideRouteAccess,
  getEffectiveMeta,
  hasMainAccessToken,
  isWhitelisted,
  normalizePathForAccess,
  userHasAnyRequiredRole,
  userRoleTypes
} from './route-access'

const whiteList = ['/', '/login', '/401', '/403']

describe('normalizePathForAccess', () => {
  it('strips query string', () => {
    expect(normalizePathForAccess('/foo?a=1')).toBe('/foo')
  })
})

describe('isWhitelisted', () => {
  it('returns true for exact match', () => {
    expect(isWhitelisted('/login', whiteList)).toBe(true)
  })

  it('supports trailing wildcard', () => {
    expect(isWhitelisted('/public/foo', ['/public*'])).toBe(true)
  })
})

describe('getEffectiveMeta', () => {
  it('merges requiresAuth with OR along matched', () => {
    const meta = getEffectiveMeta([
      { meta: {} },
      { meta: { requiresAuth: true } }
    ])
    expect(meta.requiresAuth).toBe(true)
  })

  it('uses deepest non-empty roles', () => {
    const meta = getEffectiveMeta([
      { meta: { roles: ['ADMIN'] } },
      { meta: { roles: ['HELPER'] } }
    ])
    expect(meta.requiredRoles).toEqual(['HELPER'])
  })

  it('uses deepest loginPath', () => {
    const meta = getEffectiveMeta([
      { meta: { loginPath: '/login' } },
      { meta: { loginPath: '/workschd/login' } }
    ])
    expect(meta.loginPath).toBe('/workschd/login')
  })
})

describe('userHasAnyRequiredRole', () => {
  it('returns true when no roles required', () => {
    expect(userHasAnyRequiredRole([{ roleType: 'USER' }], undefined)).toBe(true)
    expect(userHasAnyRequiredRole([{ roleType: 'USER' }], [])).toBe(true)
  })

  it('returns true when user has one of required', () => {
    expect(
      userHasAnyRequiredRole([{ roleType: 'HELPER' }, { roleType: 'USER' }], ['ADMIN', 'HELPER'])
    ).toBe(true)
  })

  it('returns false when user lacks required', () => {
    expect(userHasAnyRequiredRole([{ roleType: 'USER' }], ['ADMIN'])).toBe(false)
  })
})

describe('userRoleTypes', () => {
  it('returns empty array for null', () => {
    expect(userRoleTypes(null)).toEqual([])
  })
})

describe('hasMainAccessToken', () => {
  it('returns false for empty', () => {
    expect(hasMainAccessToken(null, '')).toBe(false)
  })

  it('accepts store token', () => {
    expect(hasMainAccessToken('abc', null)).toBe(true)
  })

  it('falls back to cookie token', () => {
    expect(hasMainAccessToken(null, 'xyz')).toBe(true)
  })
})

describe('decideRouteAccess', () => {
  beforeEach(() => {
    try {
      window.localStorage.removeItem('admin_token')
      window.sessionStorage.removeItem('admin_token')
    } catch {
      /* ignore */
    }
  })

  it('allows whitelisted path without token', () => {
    const d = decideRouteAccess({
      path: '/login',
      fullPath: '/login',
      whiteList,
      matched: [{ meta: { requiresAuth: true } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({ action: 'allow' })
  })

  it('allows public meta without token', () => {
    const d = decideRouteAccess({
      path: '/workschd',
      fullPath: '/workschd',
      whiteList: [],
      matched: [{ meta: { public: true } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({ action: 'allow' })
  })

  it('allows investand admin login via public meta without admin_token', () => {
    const d = decideRouteAccess({
      path: '/investand/admin/login',
      fullPath: '/investand/admin/login',
      whiteList: [],
      matched: [
        { meta: { project: 'investand' } },
        { meta: {} },
        { meta: { public: true, title: 'Admin Login' } }
      ],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({ action: 'allow' })
  })

  it('redirects to 401 when requiresAuth and no token', () => {
    const d = decideRouteAccess({
      path: '/workschd/funeral-board',
      fullPath: '/workschd/funeral-board',
      whiteList: [],
      matched: [{ meta: { requiresAuth: true, loginPath: '/workschd/login' } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({
      action: 'redirect',
      path: '/401',
      query: { redirect: '/workschd/funeral-board', login: '/workschd/login' }
    })
  })

  it('redirects to 403 when token but wrong role', () => {
    const d = decideRouteAccess({
      path: '/workschd/admin/dashboard',
      fullPath: '/workschd/admin/dashboard',
      whiteList: [],
      matched: [{ meta: { requiresAuth: true, roles: ['ADMIN'] } }],
      storeAccessToken: 't',
      cookieAccessToken: null,
      accountRoles: [{ roleType: 'HELPER' }]
    })
    expect(d).toEqual({ action: 'redirect', path: '/403' })
  })

  it('allows when user has required role', () => {
    const d = decideRouteAccess({
      path: '/workschd/admin/dashboard',
      fullPath: '/workschd/admin/dashboard',
      whiteList: [],
      matched: [{ meta: { requiresAuth: true, roles: ['ADMIN'] } }],
      storeAccessToken: 't',
      cookieAccessToken: null,
      accountRoles: [{ roleType: 'ADMIN' }]
    })
    expect(d).toEqual({ action: 'allow' })
  })

  it('redirects to admin login when adminAuth and no admin_token', () => {
    const d = decideRouteAccess({
      path: '/investand/admin/dashboard',
      fullPath: '/investand/admin/dashboard',
      whiteList: [],
      matched: [{ meta: { adminAuth: true } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({
      action: 'redirect',
      path: '/investand/admin/login',
      query: { redirect: '/investand/admin/dashboard' }
    })
  })

  it('allows admin route when admin_token present', () => {
    window.localStorage.setItem('admin_token', 'adm')
    const d = decideRouteAccess({
      path: '/investand/admin/dashboard',
      fullPath: '/investand/admin/dashboard',
      whiteList: [],
      matched: [{ meta: { adminAuth: true } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({ action: 'allow' })
  })
})
