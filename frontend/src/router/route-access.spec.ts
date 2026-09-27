import { describe, it, expect, beforeEach } from 'vitest'
import {
  canSeeIntegrated,
  decideRouteAccess,
  getEffectiveMeta,
  hasMainAccessToken,
  isWhitelisted,
  landingPath,
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

  it('merges integrated with OR along matched', () => {
    const meta = getEffectiveMeta([
      { meta: {} },
      { meta: { integrated: true } }
    ])
    expect(meta.integrated).toBe(true)
  })
})

describe('canSeeIntegrated', () => {
  it('allows admin with zero modules', () => {
    expect(canSeeIntegrated(true, [])).toBe(true)
  })

  it('allows two or more modules', () => {
    expect(canSeeIntegrated(false, ['workschd', 'aviation'])).toBe(true)
  })

  it('denies single non-admin module', () => {
    expect(canSeeIntegrated(false, ['workschd'])).toBe(false)
  })
})

describe('landingPath', () => {
  it('maps module codes to prefix paths', () => {
    expect(landingPath(['workschd'])).toBe('/workschd')
    expect(landingPath(['aviation'])).toBe('/aviation')
    expect(landingPath(['aipr'])).toBe('/aipr')
    expect(landingPath(['vision'])).toBe('/vision')
  })

  it('returns /403 for empty modules', () => {
    expect(landingPath([])).toBe('/403')
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

  it('redirects to 401 when requiresAuth and no token', () => {
    const d = decideRouteAccess({
      path: '/workschd/m/board',
      fullPath: '/workschd/m/board',
      whiteList: [],
      matched: [{ meta: { requiresAuth: true, loginPath: '/workschd/login' } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({
      action: 'redirect',
      path: '/401',
      query: { redirect: '/workschd/m/board', login: '/workschd/login' }
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

  it('redirects to login when adminAuth and no admin_token', () => {
    const d = decideRouteAccess({
      path: '/admin/dashboard',
      fullPath: '/admin/dashboard',
      whiteList: [],
      matched: [{ meta: { adminAuth: true } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({
      action: 'redirect',
      path: '/login',
      query: { redirect: '/admin/dashboard' }
    })
  })

  it('allows admin route when admin_token present', () => {
    window.localStorage.setItem('admin_token', 'adm')
    const d = decideRouteAccess({
      path: '/admin/dashboard',
      fullPath: '/admin/dashboard',
      whiteList: [],
      matched: [{ meta: { adminAuth: true } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({ action: 'allow' })
  })

  it('redirects anonymous integrated / to login', () => {
    const d = decideRouteAccess({
      path: '/',
      fullPath: '/',
      whiteList: ['/'],
      matched: [{ meta: { integrated: true } }],
      storeAccessToken: null,
      cookieAccessToken: null,
      accountRoles: null
    })
    expect(d).toEqual({
      action: 'redirect',
      path: '/login',
      query: { redirect: '/' }
    })
  })

  it('redirects single-module user from integrated / to module prefix', () => {
    const d = decideRouteAccess({
      path: '/',
      fullPath: '/',
      whiteList: [],
      matched: [{ meta: { integrated: true } }],
      storeAccessToken: 't',
      cookieAccessToken: null,
      accountRoles: null,
      rbacModules: ['aviation'],
      rbacIsAdmin: false
    })
    expect(d).toEqual({ action: 'redirect', path: '/aviation' })
  })

  it('allows integrated / for two modules', () => {
    const d = decideRouteAccess({
      path: '/',
      fullPath: '/',
      whiteList: [],
      matched: [{ meta: { integrated: true } }],
      storeAccessToken: 't',
      cookieAccessToken: null,
      accountRoles: null,
      rbacModules: ['workschd', 'aipr'],
      rbacIsAdmin: false
    })
    expect(d).toEqual({ action: 'allow' })
  })

  it('allows integrated / for admin with zero modules', () => {
    const d = decideRouteAccess({
      path: '/',
      fullPath: '/',
      whiteList: [],
      matched: [{ meta: { integrated: true } }],
      storeAccessToken: 't',
      cookieAccessToken: null,
      accountRoles: null,
      rbacModules: [],
      rbacIsAdmin: true
    })
    expect(d).toEqual({ action: 'allow' })
  })

  it('redirects empty non-admin integrated / to 403', () => {
    const d = decideRouteAccess({
      path: '/',
      fullPath: '/',
      whiteList: [],
      matched: [{ meta: { integrated: true } }],
      storeAccessToken: 't',
      cookieAccessToken: null,
      accountRoles: null,
      rbacModules: [],
      rbacIsAdmin: false
    })
    expect(d).toEqual({ action: 'redirect', path: '/403' })
  })
})
