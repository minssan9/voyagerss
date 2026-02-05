# Workschd Types Directory

## 📋 Overview

This directory contains TypeScript type definitions and interfaces for the Workschd module. These types ensure type safety across the frontend application and provide clear contracts for API responses and component props.

## 🗂️ File Structure

```
types/workschd/
├── task.ts          # Task, TaskEmployee, JoinRequest interfaces
├── status.ts        # Status enums and display utilities
├── schedule.ts      # Schedule configuration interfaces
└── shop.ts          # Shop/location interface
```

## 📝 Type Definitions

### task.ts

#### Task Interface
**Purpose**: Represents a task/funeral event

```typescript
interface Task {
  id?: number;                    // Optional for new tasks
  title: string;                  // Task title
  description: string;            // Detailed description
  workerCount: number;            // Number of workers needed
  startDateTime: string;          // ISO datetime string (e.g., "2024-01-15T08:00:00")
  endDateTime: string;            // ISO datetime string
  status: TaskStatus | string;    // Task status enum or string
  teamId: number | null;          // Associated team ID
  shopId: number | null;          // Associated shop ID
  shopName?: string;              // Shop name (populated by backend)
  teamName?: string;              // Team name (populated by backend)
  active: boolean;                // Whether task is active
  taskEmployees?: TaskEmployee[]; // Assigned workers
}
```

**Usage**:
```typescript
import { Task } from '@/types/workschd/task';

const task: Task = {
  title: 'Funeral Service',
  description: 'Traditional ceremony',
  workerCount: 5,
  startDateTime: '2024-01-15T08:00:00',
  endDateTime: '2024-01-15T17:00:00',
  status: TaskStatus.SCHEDULED,
  teamId: 1,
  shopId: 2,
  active: true
};
```

**Factory Function**:
```typescript
function createDefaultTask(teamId?: number): Task
```
Creates a new task with default values:
- Empty title and description
- workerCount: 1
- Start/end times: Today 08:00-17:00
- Status: SCHEDULED
- Active: true

**Usage**:
```typescript
const newTask = createDefaultTask(123);
// Pre-filled with defaults, ready for user input
```

---

#### TaskEmployee Interface
**Purpose**: Represents a worker assigned to a task

```typescript
interface TaskEmployee {
  id?: number;                    // TaskEmployee record ID
  taskId: number;                 // Associated task ID
  taskTitle?: string;             // Task title (populated)
  taskStatus?: TaskStatus | string; // Task status (populated)
  accountId: number;              // Worker account ID
  accountName?: string;           // Worker name (populated)
  accountEmail?: string;          // Worker email (populated)
  status: RequestStatus | string; // Assignment status
  requestDate?: string;           // When join was requested
  approvedAt?: string;            // Approval timestamp
  rejectedAt?: string;            // Rejection timestamp
  reason?: string;                // Rejection reason
  content?: string;               // Additional content
  description?: string;           // Description
  progress?: number;              // Work progress (0-100)
  result?: string;                // Work result
  type?: string;                  // Worker type
  size: number;                   // Worker size/capacity
}
```

**Usage**:
```typescript
const employee: TaskEmployee = {
  taskId: 1,
  accountId: 123,
  accountName: 'John Doe',
  status: RequestStatus.APPROVED,
  approvedAt: '2024-01-10T10:00:00',
  size: 1
};
```

---

#### JoinRequest Interface
**Purpose**: Represents a pending join request

```typescript
interface JoinRequest {
  id?: number;                    // Request ID
  taskId: number;                 // Task to join
  accountId: number;              // Requesting worker ID
  workerName: string;             // Worker name
  requestDate: string;            // Request timestamp
  status: RequestStatus | string; // Request status
}
```

**Usage**:
```typescript
const request: JoinRequest = {
  taskId: 1,
  accountId: 123,
  workerName: 'Jane Smith',
  requestDate: '2024-01-10T09:00:00',
  status: RequestStatus.PENDING
};
```

---

### status.ts

#### TaskStatus Enum
**Purpose**: Task lifecycle states

```typescript
enum TaskStatus {
  SCHEDULED = 'SCHEDULED',       // Task is planned
  IN_PROGRESS = 'IN_PROGRESS',   // Task is ongoing
  COMPLETED = 'COMPLETED',       // Task is finished
  CANCELLED = 'CANCELLED'        // Task was cancelled
}
```

**Display Labels** (Korean):
- SCHEDULED → "예정됨"
- IN_PROGRESS → "진행중"
- COMPLETED → "완료됨"
- CANCELLED → "취소됨"

**Display Colors** (Quasar colors):
- SCHEDULED → blue
- IN_PROGRESS → green
- COMPLETED → purple
- CANCELLED → grey

---

#### RequestStatus Enum
**Purpose**: Worker assignment/request states

```typescript
enum RequestStatus {
  PENDING = 'PENDING',           // Waiting for approval
  APPROVED = 'APPROVED',         // Request approved
  REJECTED = 'REJECTED',         // Request rejected
  ACTIVE = 'ACTIVE',             // Worker is active
  INACTIVE = 'INACTIVE'          // Worker left/ended
}
```

**Display Labels** (Korean):
- PENDING → "승인 대기중"
- APPROVED → "승인됨"
- REJECTED → "거절됨"
- ACTIVE → "참여 중"
- INACTIVE → "참여 종료"

**Display Colors**:
- PENDING → orange
- APPROVED → green
- REJECTED → red
- ACTIVE → teal
- INACTIVE → grey

---

#### Status Helper Functions

**getTaskStatusLabel(status?: string): string**
```typescript
// Get Korean label for task status
const label = getTaskStatusLabel('SCHEDULED'); // "예정됨"
```

**getTaskStatusColor(status?: string): string**
```typescript
// Get Quasar color for task status
const color = getTaskStatusColor('IN_PROGRESS'); // "green"
```

**getRequestStatusLabel(status?: string | null): string**
```typescript
// Get Korean label for request status
const label = getRequestStatusLabel('PENDING'); // "승인 대기중"
```

**getRequestStatusColor(status?: string | null): string**
```typescript
// Get Quasar color for request status
const color = getRequestStatusColor('APPROVED'); // "green"
```

**Usage in Components**:
```vue
<template>
  <q-badge :color="getTaskStatusColor(task.status)">
    {{ getTaskStatusLabel(task.status) }}
  </q-badge>
</template>

<script setup lang="ts">
import { getTaskStatusLabel, getTaskStatusColor } from '@/types/workschd/status';
</script>
```

---

### schedule.ts

#### ScheduleConfig Interface
**Purpose**: Team scheduling configuration

```typescript
interface ScheduleConfig {
  minStaffPerDay: Record<string, number>;    // Min workers per weekday
  maxOffDaysPerMonth: Record<number, number>; // Max off days per month
}
```

**Example**:
```typescript
const config: ScheduleConfig = {
  minStaffPerDay: {
    'MONDAY': 2,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 2,
    'FRIDAY': 2,
    'SATURDAY': 4,
    'SUNDAY': 4
  },
  maxOffDaysPerMonth: {
    1: 5,  // January: max 5 days off
    2: 5,  // February: max 5 days off
    // ... for all 12 months
  }
};
```

**Usage**:
Used in TeamManageScheduleConfig.vue to configure team-wide scheduling rules.

---

#### DayConfig Interface
**Purpose**: Day configuration for UI

```typescript
interface DayConfig {
  value: string;  // Day identifier (e.g., 'MONDAY')
  label: string;  // Display label (e.g., '월요일')
}
```

**Usage**:
```typescript
const days: DayConfig[] = [
  { value: 'MONDAY', label: '월요일' },
  { value: 'TUESDAY', label: '화요일' },
  // ...
];
```

---

#### MonthConfig Interface
**Purpose**: Month configuration for UI

```typescript
interface MonthConfig {
  value: number;  // Month number (1-12)
  label: string;  // Display label (e.g., '1월')
}
```

**Usage**:
```typescript
const months: MonthConfig[] = [
  { value: 1, label: '1월' },
  { value: 2, label: '2월' },
  // ...
];
```

---

### shop.ts

#### Shop Interface
**Purpose**: Represents a shop/location

```typescript
interface Shop {
  id?: number;           // Shop ID (optional for new shops)
  name: string;          // Shop name
  teamId?: number;       // Associated team ID
  region?: string;       // Region/area
  active?: boolean;      // Whether shop is active
  latitude?: number;     // GPS latitude (for mapping)
  longitude?: number;    // GPS longitude (for mapping)
}
```

**Usage**:
```typescript
const shop: Shop = {
  name: 'Main Office',
  teamId: 1,
  region: 'Seoul',
  active: true,
  latitude: 37.5665,
  longitude: 126.9780
};
```

**Use Cases**:
- Shop management in TeamManageShop.vue
- Shop selector in TaskDialog.vue
- Location mapping in TaskListMobile.vue

---

## 🏗️ Type Usage Patterns

### Form Validation with Types
```typescript
import { Task } from '@/types/workschd/task';

interface TaskFormData extends Omit<Task, 'id' | 'taskEmployees'> {
  // Form-specific fields
}

const formData = ref<TaskFormData>({
  title: '',
  description: '',
  // ... with type checking
});
```

### API Response Typing
```typescript
import { Task } from '@/types/workschd/task';

async function getTasks(): Promise<Task[]> {
  const response = await apiTask.getTasks();
  return response.data as Task[];
}
```

### Component Props Typing
```vue
<script setup lang="ts">
import { Task } from '@/types/workschd/task';

interface Props {
  task: Task;
  readOnly?: boolean;
}

const props = defineProps<Props>();
</script>
```

### Status Badge Component
```vue
<template>
  <q-badge :color="statusColor" :label="statusLabel" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getTaskStatusLabel, getTaskStatusColor } from '@/types/workschd/status';

interface Props {
  status: string;
}

const props = defineProps<Props>();

const statusLabel = computed(() => getTaskStatusLabel(props.status));
const statusColor = computed(() => getTaskStatusColor(props.status));
</script>
```

---

## 🎨 Type Conventions

### Naming Conventions
- **Interfaces**: PascalCase (e.g., `Task`, `TaskEmployee`)
- **Enums**: PascalCase (e.g., `TaskStatus`, `RequestStatus`)
- **Functions**: camelCase (e.g., `getTaskStatusLabel`)

### Optional vs Required Fields
- Use `?` for optional fields (e.g., `id?: number`)
- Omit `?` for required fields (e.g., `title: string`)
- Use `| null` when field can be explicitly null (e.g., `teamId: number | null`)

### Enum vs String Union
```typescript
// Prefer enums for fixed sets
enum TaskStatus {
  SCHEDULED = 'SCHEDULED',
  // ...
}

// Allow string fallback for API flexibility
status: TaskStatus | string;
```

---

## 🧪 Testing with Types

```typescript
import { Task, createDefaultTask } from '@/types/workschd/task';
import { TaskStatus } from '@/types/workschd/status';

describe('Task types', () => {
  it('should create default task', () => {
    const task = createDefaultTask(123);

    expect(task.teamId).toBe(123);
    expect(task.status).toBe(TaskStatus.SCHEDULED);
    expect(task.active).toBe(true);
  });

  it('should enforce required fields', () => {
    // TypeScript will error if required fields are missing
    const task: Task = {
      title: 'Test',
      description: 'Test',
      workerCount: 1,
      // ... all required fields
    };
  });
});
```

---

## 🚀 Adding New Types

When creating new types:
1. Choose appropriate file (or create new if different domain)
2. Use descriptive interface names
3. Add JSDoc comments for complex types
4. Mark optional fields with `?`
5. Export all types and enums
6. Add helper functions if needed (e.g., status helpers)
7. Update this agents.md file

Example:
```typescript
/**
 * Represents a notification in the system
 */
export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  JOIN_APPROVED = 'JOIN_APPROVED'
}

export function getNotificationIcon(type: NotificationType): string {
  // Helper function for notification icons
}
```

---

## 📚 Related Documentation

- **API Clients**: `../../api/workschd/agents.md` - API methods return these types
- **Views**: `../../views/workschd/agents.md` - Components use these types
- **Stores**: `../../stores/workschd/agents.md` - Stores manage state with these types
- **Backend Models**: `backend/prisma/workschd.prisma` - Database schema (types should match)
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/intro.html
