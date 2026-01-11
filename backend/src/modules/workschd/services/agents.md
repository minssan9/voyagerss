# Workschd Services Directory

## 📋 Overview

This directory contains the business logic layer for the Workschd module. Services handle complex operations, database interactions via Prisma, and coordinate between controllers and data models.

## 🗂️ File Structure

```
services/
├── AccountService.ts           # Account data operations
├── AuthService.ts              # Authentication logic
├── NotificationService.ts      # Multi-channel notification system
├── OAuth2Service.ts            # OAuth2 provider integrations
├── ShopService.ts              # Shop/location management
├── TaskService.ts              # Task lifecycle and worker management
└── TeamService.ts              # Team data operations
```

## 🔑 Key Services

### NotificationService.ts (599 lines)
**Purpose**: Multi-channel notification management
**Key Features**:
- Multiple notification types: TASK_ASSIGNED, TASK_UPDATED, JOIN_APPROVED, etc.
- Channels: EMAIL, SMS (Solapi), KAKAO
- Providers: EmailProvider, SolapiProvider
- Template-based notifications with variable substitution
- Read/unread status tracking

**Key Methods**:
- `createNotification(userId, type, data, channels)` - Create and send notifications
- `getNotifications(userId, filters)` - Fetch user notifications with pagination
- `markAsRead(notificationId)` - Mark notification as read
- `markAllAsRead(userId)` - Mark all notifications as read
- `getUnreadCount(userId)` - Get unread notification count
- `deleteNotification(notificationId)` - Delete a notification

**Dependencies**:
- EmailProvider (Nodemailer SMTP)
- SolapiProvider (Kakao SMS/Alimtalk)
- Prisma WorkschdClient (Notification model)

**Important Notes**:
- Notifications are sent asynchronously but created in database first
- Failed notification sends are logged but don't block the operation
- Template system uses `{{variable}}` syntax for dynamic content

---

### TaskService.ts (395 lines)
**Purpose**: Core task management with complex business logic
**Key Features**:
- Task CRUD operations with role-based access control
- Worker join request approval workflow
- Check-in/check-out system (attendance tracking)
- Transaction support for data consistency
- Automatic notification triggers

**Key Methods**:
- `createTask(data, createdBy)` - Create new task
- `getTasks(filters)` - Fetch tasks with pagination and filters
- `updateTask(taskId, data, userId)` - Update task (owner/admin only)
- `deleteTask(taskId, userId)` - Delete task (owner/admin only)
- `requestToJoin(taskId, userId, message)` - Submit join request
- `approveJoinRequest(requestId, approverId)` - Approve join request (creates TaskEmployee)
- `rejectJoinRequest(requestId, approverId, reason)` - Reject join request
- `deleteJoinRequest(requestId, userId)` - Delete own join request
- `checkIn(taskEmployeeId, userId)` - Record check-in time
- `checkOut(taskEmployeeId, userId)` - Record check-out time
- `getTaskEmployees(taskId)` - Get all workers for a task

**Transaction Patterns**:
- Uses Prisma transactions for atomic operations (e.g., approve join request + create employee + send notification)
- Rollback on any step failure to maintain data consistency

**Authorization**:
- Task owners can update/delete their tasks
- Admins can modify any task
- Only task owners can approve/reject join requests
- Workers can only check-in/out for their own assignments

**Notification Integration**:
- Automatically sends TASK_ASSIGNED notification on approval
- Sends JOIN_REQUEST notification to task owner on join request
- Uses NotificationService for all notifications

**Important Notes**:
- `joinedAt` and `leftAt` fields track actual attendance times
- Join requests must be approved before worker can participate
- Check-in/out is separate from join approval

---

### OAuth2Service.ts (249 lines)
**Purpose**: OAuth2 authentication with Google and Kakao
**Key Features**:
- Google OAuth2 flow
- Kakao OAuth2 flow
- User profile fetching and mapping
- Account creation/linking on successful OAuth

**Key Methods**:
- `getGoogleAuthUrl()` - Generate Google OAuth URL
- `handleGoogleCallback(code)` - Handle Google callback and create/link account
- `getKakaoAuthUrl()` - Generate Kakao OAuth URL
- `handleKakaoCallback(code)` - Handle Kakao callback and create/link account

**Provider Configuration**:
- Requires environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Requires environment variables: `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`

**Account Linking**:
- Links OAuth account to existing user by email if found
- Creates new account if email doesn't exist
- Stores provider info (google/kakao) and provider user ID

---

### ShopService.ts (64 lines)
**Purpose**: Shop/location management
**Key Methods**:
- `createShop(data, createdBy)` - Create new shop
- `getShops(teamId)` - Get all shops for a team
- `updateShop(shopId, data, userId)` - Update shop
- `deleteShop(shopId, userId)` - Delete shop

**Authorization**:
- Only shop owners and admins can modify shops
- Shops are scoped to teams

---

### AuthService.ts (45 lines)
**Purpose**: Basic authentication operations
**Key Methods**:
- `login(email, password)` - Authenticate user
- `register(data)` - Create new account with hashed password

**Security**:
- Uses bcrypt for password hashing
- Returns JWT token on successful login

---

### AccountService.ts (46 lines)
**Purpose**: Account data operations
**Key Methods**:
- `getAccounts(filters)` - Fetch accounts with filters
- `getAccountById(id)` - Get single account
- `createAccount(data)` - Create new account

---

### TeamService.ts (30 lines)
**Purpose**: Team data operations
**Key Methods**:
- `getTeams(filters)` - Fetch teams with filters

---

## 🏗️ Architecture Patterns

### Service Layer Responsibilities
1. **Business Logic**: All complex business rules reside in services
2. **Data Access**: Services use Prisma clients directly
3. **Transaction Management**: Services handle Prisma transactions
4. **Error Handling**: Services throw descriptive errors caught by controllers
5. **Authorization**: Services verify user permissions before operations

### Dependency Injection
- Services are instantiated with Prisma clients
- Example: `new NotificationService(workschdPrisma)`
- Allows for easy testing and client swapping

### Notification Pattern
```typescript
// Pattern used in TaskService
await notificationService.createNotification(
  userId,
  NotificationType.TASK_ASSIGNED,
  {
    taskId: task.id,
    taskTitle: task.title,
    taskDate: task.taskDate
  },
  [NotificationChannel.EMAIL, NotificationChannel.SMS]
);
```

### Transaction Pattern
```typescript
// Pattern used in TaskService.approveJoinRequest
await this.prisma.$transaction(async (tx) => {
  // 1. Update join request status
  // 2. Create TaskEmployee
  // 3. Fetch task details
  // 4. Send notification (outside tx)
});
```

## 🔐 Security Considerations

1. **Password Hashing**: AuthService uses bcrypt with salt rounds
2. **Authorization Checks**: Services verify user permissions before operations
3. **SQL Injection**: Prisma ORM provides protection
4. **Sensitive Data**: Passwords never returned in responses

## 🧪 Testing Recommendations

When testing services:
- Mock Prisma clients to avoid database dependencies
- Test transaction rollback scenarios
- Verify notification sending (mock NotificationService)
- Test authorization failures (unauthorized user scenarios)
- Test edge cases (e.g., duplicate join requests, double check-in)

## 🚀 Adding New Services

When creating a new service:
1. Follow naming convention: `{Feature}Service.ts`
2. Inject Prisma client in constructor
3. Implement business logic methods
4. Add JSDoc comments for all public methods
5. Handle errors with descriptive messages
6. Add authorization checks where needed
7. Integrate with NotificationService if applicable
8. Update this agents.md file

## 📚 Related Documentation

- **Controllers**: `../controllers/agents.md` - HTTP layer that calls these services
- **Middleware**: `../middleware/agents.md` - Authentication and authorization
- **Routes**: `../routes.ts` - API endpoint definitions
- **Prisma Schema**: `../../../prisma/workschd.prisma` - Database models
