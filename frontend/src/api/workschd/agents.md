# Workschd API Client Directory

## 📋 Overview

This directory contains TypeScript API client modules for the Workschd frontend. These modules provide type-safe interfaces to communicate with the backend REST API endpoints.

## 🗂️ File Structure

```
api/workschd/
├── axios.js                      # Axios instance with interceptors (147 lines)
├── api-account-schedule.ts       # Account scheduling API (73 lines)
├── api-notification.ts           # Notification API (84 lines)
├── api-task.ts                   # Task management API (84 lines)
├── api-team.ts                   # Team management API (114 lines)
├── api-team-schedule.ts          # Team schedule config API (66 lines)
└── api-team-shop.ts              # Shop management API (45 lines)
```

## 🔧 Core Configuration

### axios.js
**Purpose**: Configured Axios instance with authentication and error handling

**Configuration**:
- Base URL: `import.meta.env.VITE_API_URL`
- Timeout: 10 seconds
- Default headers: JSON content type, CORS headers

**Request Interceptor**:
```javascript
// Automatically adds authentication headers
{
  Authorization: `Bearer ${token}`,
  refreshToken: `${refreshToken}`,
  $accountId: userStore.accountId
}
```

**Response Interceptor**:
- Extracts new token from response headers if present
- Updates sessionStorage and cookies with new token
- Updates user store with new token

**Error Handling**:
- `401 Unauthorized`: Logout user and redirect to home
- `403 Forbidden`: Show "권한이 없습니다" notification
- `400 Bad Request`: Show "잘못된 요청입니다" notification
- `404 Not Found`: Show "잘못된 접근입니다" notification
- `500 Server Error`: Show "서버 문제입니다" notification
- All errors trigger Quasar Notify with error message

**Important Notes**:
- Token refresh is handled automatically via interceptors
- All API modules use this configured axios instance
- Notifications are automatically shown on errors

---

## 🗂️ API Modules

### api-task.ts
**Purpose**: Task and worker management API client

**Available Methods**:

**Task CRUD**:
- `createTask(data)` - Create new task
  - `POST /api/workschd/task`
- `getTasks(params?)` - List tasks with filters
  - `POST /api/workschd/task/tasks`
  - Params: `{ teamId?, status?, page?, limit? }`
- `getTask(taskId)` - Get single task
  - `GET /api/workschd/task/:id`
- `updateTask(taskId, data)` - Update task
  - `PUT /api/workschd/task/:id`
- `deleteTask(taskId)` - Delete task
  - `DELETE /api/workschd/task/:id`

**Worker Management**:
- `requestToJoin(taskId, message?)` - Request to join task
  - `POST /api/workschd/task/:taskId/request`
- `approveJoinRequest(requestId)` - Approve join request
  - `POST /api/workschd/task/request/:requestId/approve`
- `rejectJoinRequest(requestId, reason?)` - Reject join request
  - `POST /api/workschd/task/request/:requestId/reject`
- `deleteJoinRequest(requestId)` - Delete own join request
  - `DELETE /api/workschd/task/request/:requestId`
- `getTaskEmployees(taskId)` - Get task workers
  - `GET /api/workschd/task/:taskId/employees`

**Check-in/Check-out**:
- `checkIn(taskEmployeeId)` - Check in to task
  - `POST /api/workschd/task-employee/:taskEmployeeId/check-in`
- `checkOut(taskEmployeeId)` - Check out from task
  - `POST /api/workschd/task-employee/:taskEmployeeId/check-out`

**Important Notes**:
- API paths synchronized with backend in SESSION-SUMMARY.md
- All requests require authentication token (added by interceptor)

---

### api-notification.ts
**Purpose**: Notification management API client

**Available Methods**:
- `getNotifications(params?)` - Fetch notifications
  - `GET /api/workschd/notifications`
  - Params: `{ page?, limit?, type?, isRead? }`
  - Returns paginated notifications

- `getUnreadCount()` - Get unread notification count
  - `GET /api/workschd/notifications/unread/count`
  - Used by NotificationCenter for badge

- `markAsRead(notificationId)` - Mark notification as read
  - `PUT /api/workschd/notifications/:id/read`

- `markAllAsRead()` - Mark all notifications as read
  - `PUT /api/workschd/notifications/mark-all-read`

- `deleteNotification(notificationId)` - Delete notification
  - `DELETE /api/workschd/notifications/:id`

**Frontend Integration**:
- NotificationCenter polls `getUnreadCount()` every 30 seconds
- Badge shows unread count
- Clicking notification calls `markAsRead()`

---

### api-team.ts
**Purpose**: Team management and member operations

**Available Methods**:

**Team CRUD**:
- `createTeam(data)` - Create new team
- `getTeams(params?)` - List teams with filters
- `getTeam(teamId)` - Get single team
- `updateTeam(teamId, data)` - Update team
- `deleteTeam(teamId)` - Delete team

**Member Management**:
- `getTeamMembers(teamId)` - Get team members
- `addTeamMember(teamId, data)` - Add member to team
- `updateTeamMember(memberId, data)` - Update member role
- `removeTeamMember(memberId)` - Remove member from team

**Schedule Config**:
- `getScheduleConfig(teamId)` - Get team schedule configuration
- `updateScheduleConfig(teamId, data)` - Update schedule settings

**Shop Operations** (delegated to api-team-shop):
- `getShops(teamId)` - Get team shops
- `createShop(data)` - Create new shop
- `updateShop(shopId, data)` - Update shop
- `deleteShop(shopId)` - Delete shop

**Integration**:
- Used by TeamManage.vue, TeamJoin.vue
- Powers team selection dropdown
- Manages team member list

---

### api-team-schedule.ts
**Purpose**: Team schedule configuration API

**Available Methods**:
- `getScheduleConfig(teamId)` - Get schedule settings
  - Returns day/month configurations
- `updateScheduleConfig(teamId, config)` - Update schedule
  - Body: `{ dayConfig?, monthConfig? }`

**Configuration Structure**:
```typescript
{
  dayConfig: {
    enabled: boolean;
    slots: number;
    // ... other day settings
  },
  monthConfig: {
    enabled: boolean;
    slots: number;
    // ... other month settings
  }
}
```

**Frontend Usage**:
- TeamManageScheduleConfig.vue subpage
- Configures scheduling rules per team

---

### api-team-shop.ts
**Purpose**: Shop/location management API

**Available Methods**:
- `getShops(teamId)` - Get all shops for team
- `createShop(data)` - Create new shop
  - Body: `{ name, address, teamId }`
- `updateShop(shopId, data)` - Update shop
- `deleteShop(shopId)` - Delete shop

**Frontend Usage**:
- TeamManageShop.vue subpage
- Shop selector in TaskDialog.vue
- Powers shop dropdown in forms

---

### api-account-schedule.ts
**Purpose**: Account-specific scheduling preferences

**Available Methods**:
- `getAccountSchedule(accountId?)` - Get account schedule preferences
- `updateAccountSchedule(data)` - Update schedule preferences
- `getDayAvailability(accountId, date)` - Check availability for specific day
- `getMonthAvailability(accountId, year, month)` - Get monthly availability

**Frontend Usage**:
- User profile/settings
- Personal availability calendar
- Scheduling assistant

---

## 🏗️ Architecture Patterns

### API Module Template
```typescript
import axios from './axios';

interface MyData {
  // TypeScript interface
}

export const apiMyFeature = {
  async getItems(params?: any) {
    const response = await axios.get('/api/workschd/items', { params });
    return response.data;
  },

  async createItem(data: MyData) {
    const response = await axios.post('/api/workschd/items', data);
    return response.data;
  },

  // ... other methods
};
```

### Error Handling Pattern
All errors are automatically handled by axios interceptors:
```javascript
try {
  await apiTask.createTask(data);
  // Success - no notification needed
} catch (error) {
  // Error notification already shown by interceptor
  // Handle error state in component
}
```

### Request Flow
```
Component
    ↓
API Module (e.g., apiTask.createTask)
    ↓
Axios Request Interceptor
  - Add Authorization header
  - Add refreshToken header
  - Add $accountId header
    ↓
Backend API
    ↓
Axios Response Interceptor
  - Update token if provided
  - Handle errors (logout on 401, notify on others)
    ↓
Component (response data or error)
```

---

## 🔐 Authentication Flow

### Token Management
1. User logs in via AuthController
2. Backend returns JWT token
3. Frontend stores token in:
   - User store (Pinia)
   - sessionStorage
   - Cookies
4. Axios request interceptor adds token to all requests
5. Backend verifies token via authMiddleware
6. If token refreshed, response interceptor updates storage

### Automatic Logout
On `401 Unauthorized`:
1. Response interceptor detects error
2. Calls `userStore.logout()`
3. Redirects to home page `/`
4. Shows "인증되지 않았습니다" notification

---

## 🧪 Testing Recommendations

When testing API modules:
- Mock axios instance to avoid real HTTP calls
- Test success scenarios
- Test error handling (401, 403, 404, 500)
- Verify request payloads
- Verify token inclusion in headers

Example test:
```typescript
import { vi } from 'vitest';
import axios from './axios';
import { apiTask } from './api-task';

vi.mock('./axios');

describe('apiTask', () => {
  it('should create task with correct payload', async () => {
    axios.post.mockResolvedValue({ data: { id: 1 } });

    const result = await apiTask.createTask({ title: 'Test Task' });

    expect(axios.post).toHaveBeenCalledWith(
      '/api/workschd/task',
      { title: 'Test Task' }
    );
    expect(result.id).toBe(1);
  });
});
```

---

## 🚀 Adding New API Modules

When creating a new API module:
1. Create file: `api-{feature}.ts`
2. Import axios from `./axios`
3. Define TypeScript interfaces for request/response
4. Export object with async methods
5. Follow naming convention: `getXXX`, `createXXX`, `updateXXX`, `deleteXXX`
6. Add JSDoc comments for methods
7. Update this agents.md file

Example:
```typescript
import axios from './axios';

interface Widget {
  id: number;
  name: string;
}

/**
 * Widget API Client
 */
export const apiWidget = {
  /**
   * Get all widgets
   */
  async getWidgets(params?: { page?: number; limit?: number }) {
    const response = await axios.get('/api/workschd/widgets', { params });
    return response.data;
  },

  /**
   * Create new widget
   */
  async createWidget(data: Partial<Widget>) {
    const response = await axios.post('/api/workschd/widgets', data);
    return response.data;
  },
};
```

---

## 📚 Related Documentation

- **Backend Controllers**: `backend/src/modules/workschd/controllers/agents.md` - API endpoints
- **Frontend Views**: `../views/workschd/agents.md` - Components using these APIs
- **Frontend Stores**: `../stores/workschd/agents.md` - State management with API calls
- **Types**: `../types/workschd/` - TypeScript interfaces for API data
- **Session Summary**: `docs/SESSION-SUMMARY.md` - API path synchronization details
