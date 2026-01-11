# Workschd Controllers Directory

## 📋 Overview

This directory contains HTTP request handlers (controllers) for the Workschd module. Controllers are responsible for:
- Validating request data
- Calling appropriate service methods
- Formatting and returning HTTP responses
- Handling errors and sending appropriate status codes

## 🗂️ File Structure

```
controllers/
├── AccountController.ts        # Account registration and retrieval (30 lines)
├── AuthController.ts           # Authentication and OAuth2 (145 lines)
├── NotificationController.ts   # Notification management (129 lines)
├── ShopController.ts           # Shop/location CRUD (98 lines)
├── TaskController.ts           # Task and worker management (279 lines)
└── TeamController.ts           # Team retrieval (28 lines)
```

## 🔑 Key Controllers

### TaskController.ts (279 lines) - Most Complex
**Purpose**: Core business operations for task management
**Service**: TaskService

**Endpoints**:
- `POST /task` - Create new task
  - Auth: Required (any authenticated user)
  - Body: `{ title, description, taskDate, location, teamId, maxWorkers }`

- `GET /task` - List tasks with filters
  - Auth: Required
  - Query: `{ teamId?, status?, page?, limit? }`
  - Returns paginated results

- `GET /task/:id` - Get task details
  - Auth: Required
  - Returns task with employees and join requests

- `PUT /task/:id` - Update task
  - Auth: Required (task owner or admin)
  - Body: Partial task data

- `DELETE /task/:id` - Delete task
  - Auth: Required (task owner or admin)

- `POST /task/:taskId/request` - Request to join task
  - Auth: Required
  - Body: `{ message? }`

- `POST /task/request/:requestId/approve` - Approve join request
  - Auth: Required (task owner or admin)

- `POST /task/request/:requestId/reject` - Reject join request
  - Auth: Required (task owner or admin)
  - Body: `{ reason? }`

- `DELETE /task/request/:requestId` - Delete own join request
  - Auth: Required (request creator only)

- `POST /task-employee/:taskEmployeeId/check-in` - Check in to task
  - Auth: Required (assigned worker only)

- `POST /task-employee/:taskEmployeeId/check-out` - Check out from task
  - Auth: Required (assigned worker only)

- `GET /task/:taskId/employees` - Get all workers for task
  - Auth: Required

**Authorization Patterns**:
- Uses `authMiddleware.authenticate` for all endpoints
- Owner/admin checks done in service layer
- Worker-specific operations verified by userId matching

**Error Handling**:
- Returns 400 for validation errors
- Returns 401 for unauthorized access
- Returns 404 for not found resources
- Returns 500 for server errors

---

### AuthController.ts (145 lines)
**Purpose**: Authentication and OAuth2 flows
**Services**: AuthService, OAuth2Service

**Endpoints**:
- `POST /auth/login` - Login with email/password
  - No auth required
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

- `POST /auth/signup` - Register new account
  - No auth required
  - Body: `{ email, password, name, phone? }`
  - Returns: `{ token, user }`

- `GET /auth/google` - Initiate Google OAuth
  - No auth required
  - Redirects to Google consent screen

- `GET /auth/google/callback` - Handle Google OAuth callback
  - No auth required
  - Query: `{ code }`
  - Returns: `{ token, user }`

- `GET /auth/kakao` - Initiate Kakao OAuth
  - No auth required
  - Redirects to Kakao consent screen

- `GET /auth/kakao/callback` - Handle Kakao OAuth callback
  - No auth required
  - Query: `{ code }`
  - Returns: `{ token, user }`

**OAuth2 Flow**:
1. User clicks "Login with Google/Kakao"
2. Frontend redirects to `/auth/{provider}`
3. Controller redirects to provider's consent screen
4. User approves, provider redirects to `/auth/{provider}/callback`
5. Controller exchanges code for tokens
6. Controller creates/links account
7. Controller returns JWT token to frontend

**Important Notes**:
- OAuth callbacks return tokens in URL query params for frontend to capture
- Frontend should listen for OAuth popup/redirect and extract token
- Failed OAuth attempts redirect to error page with error message

---

### NotificationController.ts (129 lines)
**Purpose**: Notification CRUD and status management
**Service**: NotificationService

**Endpoints**:
- `GET /notifications` - Get user notifications
  - Auth: Required
  - Query: `{ page?, limit?, type?, isRead? }`
  - Returns paginated notifications

- `GET /notifications/unread/count` - Get unread count
  - Auth: Required
  - Returns: `{ count: number }`

- `PUT /notifications/:id/read` - Mark notification as read
  - Auth: Required (notification owner only)

- `PUT /notifications/mark-all-read` - Mark all as read
  - Auth: Required

- `DELETE /notifications/:id` - Delete notification
  - Auth: Required (notification owner only)

**Frontend Integration**:
- NotificationCenter component polls `/notifications/unread/count` every 30s
- Displays badge with unread count
- Fetches notifications on dropdown open

---

### ShopController.ts (98 lines)
**Purpose**: Shop/location management
**Service**: ShopService

**Endpoints**:
- `POST /shop` - Create new shop
  - Auth: Required
  - Body: `{ name, address, teamId }`

- `GET /shop` - List shops
  - Auth: Required
  - Query: `{ teamId }`

- `PUT /shop/:id` - Update shop
  - Auth: Required (shop owner or admin)
  - Body: Partial shop data

- `DELETE /shop/:id` - Delete shop
  - Auth: Required (shop owner or admin)

---

### AccountController.ts (30 lines)
**Purpose**: Account data retrieval
**Service**: AccountService

**Endpoints**:
- `POST /account` - Create account (used internally)
  - Auth: Required (admin only)

- `GET /account` - List accounts
  - Auth: Required
  - Query: `{ page?, limit? }`

---

### TeamController.ts (28 lines)
**Purpose**: Team data retrieval
**Service**: TeamService

**Endpoints**:
- `GET /team` - List teams
  - Auth: Required
  - Query: `{ page?, limit? }`

---

## 🏗️ Architecture Patterns

### Controller Structure
```typescript
export class TaskController {
  constructor(private taskService: TaskService) {}

  async createTask(req: Request, res: Response) {
    try {
      // 1. Extract and validate request data
      const { title, description } = req.body;
      const userId = req.user.id; // From auth middleware

      // 2. Call service method
      const task = await this.taskService.createTask(data, userId);

      // 3. Return formatted response
      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      // 4. Handle errors
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}
```

### Request Flow
```
Client Request
    ↓
Routes (routes.ts)
    ↓
Auth Middleware (if required)
    ↓
Controller
    ↓
Service Layer
    ↓
Prisma / Database
    ↓
Service Layer
    ↓
Controller
    ↓
HTTP Response
```

### Response Format
All controllers follow consistent response format:

**Success Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Paginated Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev mode only)"
}
```

### Authentication Integration
Controllers use `req.user` populated by `authMiddleware.authenticate`:
```typescript
const userId = req.user.id;
const userRole = req.user.role;
```

## 🔒 Authorization Levels

### Route-Level Authorization
Applied in routes.ts using middleware:
```typescript
router.post('/task', authenticate, taskController.createTask);
router.delete('/task/:id', authenticate, isAdmin, taskController.deleteTask);
```

### Controller-Level Authorization
Controllers can perform additional checks:
```typescript
if (task.createdBy !== userId && !isAdmin(req.user)) {
  return res.status(403).json({ message: 'Unauthorized' });
}
```

### Service-Level Authorization
Most authorization logic is in services for reusability.

## 🧪 Testing Recommendations

When testing controllers:
- Mock service layer methods
- Test request validation
- Test error handling paths
- Test authentication middleware integration
- Test response formatting
- Verify HTTP status codes

Example test structure:
```typescript
describe('TaskController', () => {
  it('should create task with valid data', async () => {
    // Mock taskService.createTask
    // Call controller method
    // Verify response status and data
  });

  it('should return 400 for invalid data', async () => {
    // Call controller with invalid data
    // Verify 400 status and error message
  });
});
```

## 🚀 Adding New Controllers

When creating a new controller:
1. Create file: `{Feature}Controller.ts`
2. Inject required services in constructor
3. Implement request handlers following patterns above
4. Add JSDoc comments for endpoints
5. Register routes in `../routes.ts`
6. Add authentication middleware where needed
7. Test all endpoints
8. Update this agents.md file

## 📚 Related Documentation

- **Services**: `../services/agents.md` - Business logic called by controllers
- **Middleware**: `../middleware/agents.md` - Authentication and authorization
- **Routes**: `../routes.ts` - API endpoint registry
- **Frontend API**: `frontend/src/api/workschd/agents.md` - Client-side API calls
