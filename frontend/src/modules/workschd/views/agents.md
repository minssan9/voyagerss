# Workschd Views Directory

## 📋 Overview

This directory contains Vue 3 components that represent full-page views in the Workschd application. Views are routed pages that compose smaller components and handle user interactions.

## 🗂️ Directory Structure

```
views/workschd/
├── admin/
│   └── AdminDashboard.vue              # Admin statistics and management
├── main/
│   ├── Home.vue                        # Landing page
│   ├── Dashboard.vue                   # User dashboard
│   ├── About.vue                       # About page
│   ├── Terms.vue                       # Terms of service
│   ├── PrivacyPolicy.vue              # Privacy policy
│   └── Subscription.vue                # Subscription/pricing page
├── task/
│   ├── TaskManage.vue                  # Desktop task management (AG Grid)
│   ├── TaskManageMobile.vue           # Mobile task management (Manager view)
│   ├── TaskListMobile.vue             # Mobile task list (Worker view)
│   ├── dialog/
│   │   └── TaskDialog.vue             # Task create/edit dialog
│   └── grid/
│       └── TaskEmployeeGrid.vue       # Worker assignment grid
└── team/
    ├── TeamManage.vue                  # Team management page
    ├── TeamJoin.vue                    # Team join/discovery page
    ├── dialog/
    │   ├── TeamApproveDialog.vue      # Join request approval dialog
    │   └── TeamRegistrationDialog.vue # Team creation dialog
    └── subpage/
        ├── TeamMembers.vue            # Team member management
        ├── TeamManageScheduleConfig.vue # Schedule configuration
        └── TeamManageShop.vue         # Shop management
```

## 📱 View Categories

### Admin Views

#### AdminDashboard.vue
**Purpose**: Administrative overview and statistics
**Route**: `/workschd/admin/dashboard`
**Auth**: Admin only

**Features**:
- Statistics cards (total tasks, open tasks, worker count)
- Team management table
- Recent activity feed
- Quick actions for admin operations

**State Management**:
- Uses API calls directly (no dedicated store)
- Fetches data on mount

**Components Used**:
- Quasar QCard, QTable
- Custom statistics cards

---

### Main Views (Public/Landing Pages)

#### Home.vue
**Purpose**: Landing page with feature showcase
**Route**: `/workschd` or `/workschd/home`
**Auth**: None (public)

**Features**:
- Hero section with CTA
- Feature highlights
- Testimonials
- Footer with links

#### Dashboard.vue
**Purpose**: User dashboard after login
**Route**: `/workschd/dashboard`
**Auth**: Required

**Features**:
- Personalized task overview
- Upcoming events
- Quick actions
- Notifications summary

#### About.vue, Terms.vue, PrivacyPolicy.vue, Subscription.vue
**Purpose**: Informational pages
**Route**: `/workschd/about`, `/workschd/terms`, etc.
**Auth**: None (public)

**Features**:
- Static content
- Responsive layout
- Footer navigation

---

### Task Views

#### TaskManage.vue (Desktop)
**Purpose**: Primary task management interface for desktop
**Route**: `/workschd/task/manage`
**Auth**: Required (Team Leader/Admin)

**Features**:
- AG Grid with full CRUD operations
- Inline editing
- Advanced filtering and sorting
- Bulk operations
- Excel export
- Task status management
- Worker assignment via TaskEmployeeGrid

**Key Components**:
- AG Grid table
- TaskDialog for create/edit
- TaskEmployeeGrid for worker management

**State Management**:
- Uses team store for team selection
- Local state for grid data
- Refetches on CRUD operations

**Grid Columns**:
- Task title, description
- Task date, location
- Status, max workers
- Created by, created at
- Actions (edit, delete, assign workers)

**Important Notes**:
- Designed for desktop/tablet (min-width: 768px)
- Uses AG Grid Enterprise features (if licensed)
- Mobile users redirected to TaskManageMobile

---

#### TaskManageMobile.vue (Mobile - Manager)
**Purpose**: Task management for mobile devices (manager view)
**Route**: `/workschd/task/manage-mobile`
**Auth**: Required (Team Leader/Admin)

**Features**:
- Card-based layout
- Swipe actions
- Pull-to-refresh
- Task creation via dialog
- Worker assignment
- Status updates

**Differences from Desktop**:
- Simplified UI for smaller screens
- Touch-optimized interactions
- Limited filtering options
- One task at a time focus

**State Management**:
- Similar to TaskManage.vue
- Optimized for mobile performance

---

#### TaskListMobile.vue (Mobile - Worker)
**Purpose**: Task list for workers on mobile
**Route**: `/workschd/task/list-mobile`
**Auth**: Required (Worker)

**Features**:
- Available tasks list
- Join request submission
- My assigned tasks
- Check-in/check-out buttons
- Task details view
- Navigation map integration (optional)

**Worker Actions**:
- Request to join tasks
- Check in when arriving
- Check out when leaving
- View task details (location, time, etc.)

**State Management**:
- Fetches tasks assigned to current user
- Fetches available tasks to join
- Real-time status updates

**Important Notes**:
- Focused on worker workflow
- Location-aware features (GPS check-in)
- Push notification integration

---

#### TaskDialog.vue
**Purpose**: Modal dialog for creating/editing tasks
**Usage**: Opened from TaskManage or TaskManageMobile

**Props**:
- `task?: Task` - Existing task for edit mode (null for create)
- `teamId?: number` - Pre-selected team

**Features**:
- Form with validation
- Date picker (Quasar QDate)
- Location input (text or map selector)
- Shop selector (dropdown from team shops)
- Max workers input
- Team selector

**Emits**:
- `@saved` - When task created/updated
- `@closed` - When dialog closed

**Validation**:
- Required fields: title, taskDate, location, teamId
- Max workers must be positive integer
- Date must be future date (for new tasks)

**API Calls**:
- `apiTask.createTask(data)` - Create mode
- `apiTask.updateTask(taskId, data)` - Edit mode

---

#### TaskEmployeeGrid.vue
**Purpose**: Manage workers assigned to a task
**Usage**: Embedded in TaskManage or opened as dialog

**Props**:
- `taskId: number` - The task to manage workers for

**Features**:
- List of assigned workers
- Pending join requests
- Approve/reject buttons
- Remove worker action
- Worker status (checked in/out)
- Join/leave times display

**Grid Columns**:
- Worker name, email
- Status (assigned, pending, checked-in)
- Joined at, left at (check-in times)
- Actions (approve, reject, remove)

**API Calls**:
- `apiTask.getTaskEmployees(taskId)` - Fetch workers
- `apiTask.approveJoinRequest(requestId)` - Approve
- `apiTask.rejectJoinRequest(requestId)` - Reject

**State Management**:
- Local state for workers and requests
- Refetches on approve/reject/remove

---

### Team Views

#### TeamManage.vue
**Purpose**: Primary team management interface
**Route**: `/workschd/team/manage`
**Auth**: Required (Team Leader/Admin)

**Features**:
- Team selector dropdown
- Tabbed interface:
  - Members tab (TeamMembers.vue)
  - Schedule config tab (TeamManageScheduleConfig.vue)
  - Shops tab (TeamManageShop.vue)
- Quick actions (invite members, create shop)

**State Management**:
- Uses team store (Pinia)
- Loads selected team on mount
- Updates store on team selection

**Tabs**:
1. **Members**: TeamMembers.vue subpage
2. **Schedule**: TeamManageScheduleConfig.vue subpage
3. **Shops**: TeamManageShop.vue subpage

---

#### TeamJoin.vue
**Purpose**: Discover and join teams
**Route**: `/workschd/team/join`
**Auth**: Required

**Features**:
- Browse available teams
- Search and filter
- Request to join team
- Pending requests status
- Team details preview

**API Calls**:
- `apiTeam.getTeams({ public: true })` - Public teams
- `apiTeam.requestToJoin(teamId, message)` - Join request

**State Management**:
- Local state for teams and requests
- Refetches on request submission

---

#### TeamRegistrationDialog.vue
**Purpose**: Create new team
**Usage**: Opened from TeamJoin or TeamManage

**Props**: None

**Features**:
- Team name input
- Description textarea
- Team visibility (public/private)
- Team type selector

**Emits**:
- `@saved` - When team created
- `@closed` - When dialog closed

**API Calls**:
- `apiTeam.createTeam(data)`

**Validation**:
- Required: name
- Optional: description, isPublic

---

#### TeamApproveDialog.vue
**Purpose**: Approve/reject team join requests
**Usage**: Opened from TeamMembers.vue

**Props**:
- `requests: JoinRequest[]` - Pending requests to review

**Features**:
- List of pending requests
- Approve button (adds member)
- Reject button (with optional reason)
- Bulk approve/reject

**Emits**:
- `@approved` - When request approved
- `@rejected` - When request rejected

**API Calls**:
- `apiTeam.approveJoinRequest(requestId)`
- `apiTeam.rejectJoinRequest(requestId, reason)`

---

#### TeamMembers.vue (Subpage)
**Purpose**: Manage team members
**Parent**: TeamManage.vue (members tab)

**Features**:
- Member list table
- Role assignment (Leader, Member, Helper)
- Remove member action
- Invite new member button
- Pending join requests badge

**API Calls**:
- `apiTeam.getTeamMembers(teamId)` - Fetch members
- `apiTeam.updateTeamMember(memberId, { role })` - Update role
- `apiTeam.removeTeamMember(memberId)` - Remove member

**State Management**:
- Uses team store for selected team
- Local state for members list

---

#### TeamManageScheduleConfig.vue (Subpage)
**Purpose**: Configure team scheduling rules
**Parent**: TeamManage.vue (schedule tab)

**Features**:
- Day-based scheduling config
  - Enable/disable day scheduling
  - Slots per day
  - Advance booking days
- Month-based scheduling config
  - Enable/disable month scheduling
  - Slots per month
  - Recurring rules

**API Calls**:
- `apiTeamSchedule.getScheduleConfig(teamId)`
- `apiTeamSchedule.updateScheduleConfig(teamId, config)`

**State Management**:
- Uses team store for schedule config
- Updates store on save

---

#### TeamManageShop.vue (Subpage)
**Purpose**: Manage team shops/locations
**Parent**: TeamManage.vue (shops tab)

**Features**:
- Shops list table
- Add shop button
- Edit shop (name, address)
- Delete shop action
- Default shop selector

**API Calls**:
- `apiTeamShop.getShops(teamId)` - Fetch shops
- `apiTeamShop.createShop(data)` - Create shop
- `apiTeamShop.updateShop(shopId, data)` - Update shop
- `apiTeamShop.deleteShop(shopId)` - Delete shop

**State Management**:
- Uses team store for shops list
- Updates store on CRUD operations

---

## 🏗️ Architecture Patterns

### View Component Template
```vue
<template>
  <q-page>
    <!-- Page content -->
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { apiTask } from '@/api/workschd/api-task';

const $q = useQuasar();
const router = useRouter();

const data = ref([]);
const loading = ref(false);

async function fetchData() {
  loading.value = true;
  try {
    const response = await apiTask.getTasks();
    data.value = response.data;
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to load data' });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchData();
});
</script>
```

### Dialog Component Pattern
```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const formData = ref({ ... });

function onSubmit() {
  onDialogOK(formData.value);
}
</script>
```

### Mobile/Desktop Responsive Pattern
```vue
<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();

if ($q.platform.is.mobile) {
  router.replace('/workschd/task/manage-mobile');
}
</script>
```

---

## 🎨 UI Framework

All views use **Quasar Framework** components:
- QPage, QCard, QTable, QBtn, QInput, QSelect
- QDialog for modals
- QNotify for notifications
- QLoading for loading states
- QTooltip for hints

**Styling**:
- Quasar utility classes
- Custom CSS in `<style scoped>`
- Responsive breakpoints via Quasar's `$q.screen`

---

## 🔒 Route Guards

Views with authentication requirements use router guards:

```typescript
// In router/workschd/routes.ts
{
  path: '/task/manage',
  component: TaskManage,
  meta: { requiresAuth: true, roles: ['TEAM_LEADER', 'ADMIN'] }
}
```

Global guard checks `meta.requiresAuth` and redirects to login if needed.

---

## 🧪 Testing Recommendations

When testing view components:
- Mock API modules (apiTask, apiTeam, etc.)
- Mock router and route params
- Mock Quasar plugins ($q.notify, $q.dialog)
- Test user interactions (button clicks, form submissions)
- Test error states (API failures)
- Test loading states
- Test responsive behavior (mobile vs desktop)

---

## 🚀 Adding New Views

When creating a new view:
1. Choose appropriate directory (main, task, team, admin)
2. Create `.vue` file with descriptive name
3. Use Quasar QPage as root element
4. Implement script setup with TypeScript
5. Add API calls in async functions
6. Handle loading and error states
7. Add route in `router/workschd/routes.ts`
8. Add navigation links where appropriate
9. Test on mobile and desktop
10. Update this agents.md file

---

## 📚 Related Documentation

- **API Clients**: `../../api/workschd/agents.md` - API methods used by views
- **Stores**: `../../stores/workschd/` - Pinia state management
- **Components**: `../../components/workschd/` - Reusable components
- **Router**: `../../router/workschd/routes.ts` - Route definitions
- **Types**: `../../types/workschd/` - TypeScript interfaces
