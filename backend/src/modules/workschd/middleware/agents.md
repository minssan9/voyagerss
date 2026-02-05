# Workschd Middleware Directory

## 📋 Overview

This directory contains Express middleware for the Workschd module. Middleware intercepts requests before they reach controllers to handle authentication, authorization, and request preprocessing.

## 🗂️ File Structure

```
middleware/
└── authMiddleware.ts    # JWT authentication and role-based access control (222 lines)
```

## 🔑 Authentication Middleware

### authenticate
**Purpose**: Verify JWT token and populate `req.user` with account information

**Usage**:
```typescript
router.get('/tasks', authenticate, taskController.getTasks);
```

**Flow**:
1. Extract token from `Authorization: Bearer <token>` header
2. Verify JWT signature using `JWT_SECRET`
3. Decode token to get `accountId`
4. Query database to fetch account and roles
5. Verify account status is `ACTIVE`
6. Populate `req.user` with account data
7. Call `next()` to proceed to controller

**req.user Structure**:
```typescript
{
  accountId: number;
  email: string;
  roles: string[];  // e.g., ['ADMIN', 'TEAM_LEADER']
}
```

**Error Responses**:
- `401 Unauthorized`: No token, invalid token, expired token, or inactive account
- `500 Internal Server Error`: Database or unexpected errors

**Security Considerations**:
- JWT secret should be strong and stored in environment variables
- Tokens should have reasonable expiration times (configured in AuthService)
- Account status check prevents deleted/disabled users from accessing system

---

## 🔐 Authorization Middleware

### authorize(...roles)
**Purpose**: Restrict access to specific roles
**Type**: Higher-order function that returns middleware

**Usage**:
```typescript
router.delete('/task/:id', authenticate, authorize('ADMIN', 'TEAM_LEADER'), controller.delete);
```

**Flow**:
1. Check if `req.user` exists (authenticate must run first)
2. Check if user has at least one of the required roles
3. Return 403 if user lacks required roles
4. Call `next()` if authorized

**Error Responses**:
- `401 Unauthorized`: No user (authenticate not run)
- `403 Forbidden`: User lacks required roles (includes role details in response)

---

## 🎯 Role-Based Middleware Helpers

### isAdmin
**Purpose**: Restrict to ADMIN role only
**Usage**: `router.delete('/shop/:id', authenticate, isAdmin, controller.delete)`
**Equivalent**: `authorize('ADMIN')`

### isTeamLeader
**Purpose**: Restrict to ADMIN or TEAM_LEADER roles
**Usage**: `router.post('/team', authenticate, isTeamLeader, controller.create)`
**Equivalent**: `authorize('ADMIN', 'TEAM_LEADER')`

### isHelper
**Purpose**: Restrict to ADMIN, TEAM_LEADER, or HELPER roles
**Usage**: `router.get('/team/:id', authenticate, isHelper, controller.get)`
**Equivalent**: `authorize('ADMIN', 'TEAM_LEADER', 'HELPER')`

---

## 🏢 Resource Ownership Middleware

### isTeamOwner
**Purpose**: Verify user is the team leader (or admin)
**Usage**: `router.put('/team/:teamId', authenticate, isTeamOwner, controller.update)`

**Flow**:
1. Extract `teamId` from `req.params.teamId` or `req.body.teamId`
2. If user is ADMIN, allow access immediately
3. Query `TeamMember` table for user's membership with role `LEADER`
4. Return 403 if not a leader of this team
5. Call `next()` if authorized

**Error Responses**:
- `400 Bad Request`: Missing teamId
- `401 Unauthorized`: No user
- `403 Forbidden`: Not the team leader
- `500 Internal Server Error`: Database errors

**Important Notes**:
- ADMIN role bypasses ownership check
- Checks for `LEADER` role in TeamMember, not global TEAM_LEADER role

---

### isTaskOwner
**Purpose**: Verify user created the task (or is admin)
**Usage**: `router.put('/task/:id', authenticate, isTaskOwner, controller.update)`

**Flow**:
1. Extract `taskId` from `req.params.id` or `req.params.taskId`
2. If user is ADMIN, allow access immediately
3. Query Task table to verify `task.createdBy === req.user.accountId`
4. Return 403 if not the owner
5. Call `next()` if authorized

**Error Responses**:
- `400 Bad Request`: Missing taskId
- `401 Unauthorized`: No user
- `403 Forbidden`: Not the task owner
- `404 Not Found`: Task doesn't exist
- `500 Internal Server Error`: Database errors

**Important Notes**:
- ADMIN role bypasses ownership check
- Task existence is verified before ownership

---

## 🏗️ Middleware Composition Patterns

### Pattern 1: Authentication Only
```typescript
router.get('/tasks', authenticate, controller.getTasks);
// Any authenticated user can access
```

### Pattern 2: Authentication + Role Check
```typescript
router.post('/team', authenticate, isTeamLeader, controller.createTeam);
// Only ADMIN or TEAM_LEADER can access
```

### Pattern 3: Authentication + Ownership Check
```typescript
router.put('/task/:id', authenticate, isTaskOwner, controller.updateTask);
// Only task owner or ADMIN can access
```

### Pattern 4: Multiple Middleware
```typescript
router.delete('/shop/:id',
  authenticate,        // 1. Verify JWT
  isTeamOwner,        // 2. Verify team ownership
  controller.delete   // 3. Execute controller
);
```

**Order Matters**: `authenticate` must always run before other auth middleware!

---

## 🔄 Request Flow Example

```
Client Request: GET /api/workschd/task/123
Headers: Authorization: Bearer eyJhbGc...

    ↓

authenticate middleware:
  - Extract token
  - Verify signature
  - Fetch account from DB
  - Set req.user = { accountId: 1, email: 'user@example.com', roles: ['USER'] }
  - Call next()

    ↓

isTaskOwner middleware:
  - Extract taskId = 123
  - Fetch task from DB
  - Verify task.createdBy === req.user.accountId
  - Call next()

    ↓

Controller:
  - Access req.user.accountId
  - Process request
  - Return response
```

---

## 🔑 Role Hierarchy

```
ADMIN          (Highest - can access everything)
  ↓
TEAM_LEADER    (Can manage their teams)
  ↓
HELPER         (Can view and assist)
  ↓
USER           (Basic access)
```

**Key Points**:
- ADMIN role bypasses all ownership checks
- Multiple roles can be assigned to one account
- Role checks use `Array.some()` - user needs only ONE of the required roles

---

## 🧪 Testing Recommendations

When testing middleware:

**authenticate**:
- Test missing token → 401
- Test invalid token → 401
- Test expired token → 401
- Test valid token with inactive account → 401
- Test valid token with active account → populates req.user

**authorize**:
- Test without authenticate → 401
- Test with wrong roles → 403
- Test with correct role → next()
- Test with ADMIN role (should pass all checks)

**isTaskOwner**:
- Test with task owner → next()
- Test with non-owner → 403
- Test with ADMIN role → next()
- Test with non-existent task → 404

---

## 🔒 Security Best Practices

1. **JWT Secret**: Use strong secret, store in `process.env.JWT_SECRET`
2. **Token Expiration**: Set reasonable expiration (e.g., 24h)
3. **HTTPS Only**: Always use HTTPS in production
4. **Account Status**: Check account status to disable accounts
5. **Error Messages**: Don't leak sensitive info in error messages
6. **Database Queries**: All queries use Prisma (SQL injection protection)
7. **Rate Limiting**: Consider adding rate limiting middleware

---

## 🚀 Adding New Middleware

When creating new middleware:
1. Follow Express middleware signature: `(req, res, next) => void`
2. Always call `next()` on success or send response on failure
3. Use TypeScript `AuthRequest` type for type safety
4. Handle errors gracefully with try/catch
5. Add JSDoc comments
6. Update this agents.md file

Example template:
```typescript
export const myMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Your logic here

    // On success:
    next();

    // On failure:
    // res.status(403).json({ message: 'Forbidden' });
    // return;
  } catch (error) {
    console.error('Middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
```

---

## 📚 Related Documentation

- **Controllers**: `../controllers/agents.md` - Use these middleware in routes
- **Services**: `../services/agents.md` - AuthService creates JWT tokens
- **Routes**: `../routes.ts` - Middleware composition examples
- **Prisma Schema**: `../../../prisma/workschd.prisma` - Account and role models
