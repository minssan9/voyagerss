import type { RouteRecordNormalized } from 'vue-router'

export type MatchedWithMeta = Pick<RouteRecordNormalized, 'meta'>

/** Deepest wins for roles and loginPath; flags use OR along matched chain (except public). */
export interface EffectiveRouteMeta {
  public: boolean
  requiresAuth: boolean
  adminAuth: boolean
  /** Integrated hub (`/`) — gated by RBAC module membership */
  integrated: boolean
  /** Deepest non-empty `meta.roles` array, if any */
  requiredRoles: string[] | undefined
  /** Deepest `meta.loginPath` string, if any */
  loginPath: string | undefined
  /** RBAC permission code required to access this page (e.g. 'workschd:page:admin-rbac') */
  rbacPermission: string | undefined
}

export const MODULE_LANDING_PATHS: Record<string, string> = {
  workschd: '/workschd',
  aviation: '/aviation',
  aipr: '/aipr',
  vision: '/vision'
}

/** Integrated hub is visible to admins or users with two or more modules. */
export function canSeeIntegrated(isAdmin: boolean, modules: readonly string[]): boolean {
  return isAdmin || modules.length >= 2
}

/** Redirect target when the user has exactly one module. */
export function landingPath(modules: readonly string[]): string {
  const mod = modules[0]
  if (!mod) return '/403'
  return MODULE_LANDING_PATHS[mod] ?? '/403'
}

export function normalizePathForAccess(path: string): string {
  const base = path.split('?')[0] ?? path
  return base.length > 1 && base.endsWith('/') ? base.slice(0, -1) : base
}

export function isWhitelisted(path: string, whiteList: string[]): boolean {
  const p = normalizePathForAccess(path)
  if (whiteList.includes(p)) return true
  return whiteList.some((w) => w.endsWith('*') && p.startsWith(w.slice(0, -1)))
}

export function getEffectiveMeta(matched: readonly MatchedWithMeta[]): EffectiveRouteMeta {
  let publicMeta = false
  let requiresAuth = false
  let adminAuth = false
  let integrated = false
  let requiredRoles: string[] | undefined
  let loginPath: string | undefined
  let rbacPermission: string | undefined

  for (const m of matched) {
    const meta = m.meta as Record<string, unknown> | undefined
    if (!meta) continue
    if (meta.public === true) publicMeta = true
    if (meta.requiresAuth === true) requiresAuth = true
    if (meta.adminAuth === true) adminAuth = true
    if (meta.integrated === true) integrated = true
    if (typeof meta.loginPath === 'string' && meta.loginPath.length > 0) {
      loginPath = meta.loginPath
    }
    const roles = meta.roles
    if (Array.isArray(roles) && roles.length > 0 && roles.every((r) => typeof r === 'string')) {
      requiredRoles = roles as string[]
    }
    if (typeof meta.rbacPermission === 'string' && meta.rbacPermission.length > 0) {
      rbacPermission = meta.rbacPermission
    }
  }

  return { public: publicMeta, requiresAuth, adminAuth, integrated, requiredRoles, loginPath, rbacPermission }
}

export function userRoleTypes(
  accountRoles: ReadonlyArray<{ roleType: string }> | null | undefined
): string[] {
  return accountRoles?.map((r) => r.roleType) ?? []
}

/** User must have at least one of `required` role types. */
export function userHasAnyRequiredRole(
  accountRoles: ReadonlyArray<{ roleType: string }> | null | undefined,
  required: string[] | undefined
): boolean {
  if (!required || required.length === 0) return true
  const types = new Set(userRoleTypes(accountRoles))
  return required.some((r) => types.has(r))
}

export function hasMainAccessToken(
  storeToken: string | null | undefined,
  cookieToken: string | null | undefined
): boolean {
  const t = (storeToken ?? cookieToken ?? '').trim()
  return t.length > 0
}

export function readAdminTokenFromWindow(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return (
      window.localStorage.getItem('admin_token') ||
      window.sessionStorage.getItem('admin_token') ||
      null
    )
  } catch {
    return null
  }
}

export type RouteAccessDecision =
  | { action: 'allow' }
  | { action: 'redirect'; path: string; query?: Record<string, string> }

export function decideRouteAccess(input: {
  path: string
  fullPath: string
  whiteList: string[]
  matched: readonly MatchedWithMeta[]
  storeAccessToken: string | null | undefined
  cookieAccessToken: string | null | undefined
  accountRoles: ReadonlyArray<{ roleType: string }> | null | undefined
  /** RBAC page permission codes loaded from the server for the current user */
  rbacPagePermissions?: readonly string[]
  /** Module codes from GET /api/rbac/me */
  rbacModules?: readonly string[]
  /** Platform admin flag from GET /api/rbac/me */
  rbacIsAdmin?: boolean
}): RouteAccessDecision {
  const meta = getEffectiveMeta(input.matched)

  if (meta.integrated) {
    const hasMain = hasMainAccessToken(input.storeAccessToken, input.cookieAccessToken)
    if (!hasMain) {
      return {
        action: 'redirect',
        path: '/login',
        query: { redirect: input.fullPath }
      }
    }

    const modules = input.rbacModules ?? []
    const isAdmin = input.rbacIsAdmin ?? false

    if (canSeeIntegrated(isAdmin, modules)) {
      return { action: 'allow' }
    }
    if (modules.length === 1) {
      return { action: 'redirect', path: landingPath(modules) }
    }
    return { action: 'redirect', path: '/403' }
  }

  const wl = isWhitelisted(input.path, input.whiteList)

  if (meta.public || wl) {
    return { action: 'allow' }
  }

  const hasMain = hasMainAccessToken(input.storeAccessToken, input.cookieAccessToken)
  const adminTok = readAdminTokenFromWindow()

  if (meta.adminAuth) {
    if (!adminTok || !adminTok.trim()) {
      return {
        action: 'redirect',
        path: '/login',
        query: { redirect: input.fullPath }
      }
    }
    if (meta.requiresAuth && !hasMain) {
      const login = meta.loginPath ?? '/login'
      return {
        action: 'redirect',
        path: '/401',
        query: { redirect: input.fullPath, login: login }
      }
    }
    if (meta.requiredRoles?.length && !userHasAnyRequiredRole(input.accountRoles, meta.requiredRoles)) {
      return { action: 'redirect', path: '/403' }
    }
    return { action: 'allow' }
  }

  if (meta.requiresAuth && !hasMain) {
    const login = meta.loginPath ?? '/login'
    return {
      action: 'redirect',
      path: '/401',
      query: { redirect: input.fullPath, login: login }
    }
  }

  if (meta.requiresAuth && meta.requiredRoles?.length) {
    if (!userHasAnyRequiredRole(input.accountRoles, meta.requiredRoles)) {
      return { action: 'redirect', path: '/403' }
    }
  }

  // RBAC page permission check (when the route declares meta.rbacPermission)
  if (meta.rbacPermission && input.rbacPagePermissions?.length) {
    if (!input.rbacPagePermissions.includes(meta.rbacPermission)) {
      return { action: 'redirect', path: '/403' }
    }
  }

  return { action: 'allow' }
}
