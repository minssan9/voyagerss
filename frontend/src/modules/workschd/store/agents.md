# Workschd Stores Directory

## 📋 Overview

This directory contains Pinia state management stores for the Workschd module. Stores centralize application state and provide reactive data sharing across components.

## 🗂️ File Structure

```
stores/workschd/
└── store_team.ts    # Team state management (193 lines)
```

## 🏪 Team Store (store_team.ts)

### Purpose
Centralized state management for teams, team members, schedule configurations, and shops.

### State Structure

```typescript
interface TeamState {
  teams: Team[];                    // List of all teams
  selectedTeam: Team | null;        // Currently selected team
  teamMembers: TeamMember[];        // Members of selected team
  scheduleConfig: ScheduleConfig;   // Schedule configuration
  shops: Shop[];                    // Shops for selected team
  isLoadingShops: boolean;          // Loading state for shops
  error: string | null;             // Error message
  teamsTotalCount: number;          // Total count for pagination
}
```

**Default State**:
- `teams`: Empty array
- `selectedTeam`: null
- `scheduleConfig`: Default config with:
  - `minStaffPerDay`: 1 for all weekdays
  - `maxOffDaysPerMonth`: 4 for all months
- `shops`: Empty array
- `isLoadingShops`: false
- `error`: null

---

## 🎬 Actions

### Team Management

#### createTeam(team: Partial<Team>)
**Purpose**: Add team to local state (optimistic update)
**Usage**: After creating team via API
```typescript
const teamStore = useTeamStore();
teamStore.createTeam({ name: 'New Team', description: 'Test' });
```

#### setSelectedTeam(team: Team | null)
**Purpose**: Set currently selected team
**Usage**: When user selects team from dropdown
```typescript
teamStore.setSelectedTeam(team);
```

#### async setTeam(teamId: number | null)
**Purpose**: Set team by ID and fetch associated shops
**Flow**:
1. If teamId is null, clear selected team and shops
2. Find team in `teams` array
3. Set as `selectedTeam`
4. Fetch shops for this team via `fetchShopsByTeamId()`

**Usage**:
```typescript
await teamStore.setTeam(123);
```

**Important**: This is the preferred method for team selection as it also loads shops.

---

### Team Member Management

#### updateTeamMembers(members: TeamMember[])
**Purpose**: Update team members in state
**Usage**: After fetching or modifying members
```typescript
teamStore.updateTeamMembers(newMembers);
```

---

### Schedule Configuration

#### updateScheduleConfig(config: ScheduleConfig)
**Purpose**: Update schedule configuration
**Usage**: After fetching or saving schedule config
```typescript
teamStore.updateScheduleConfig({
  minStaffPerDay: { MONDAY: 2, TUESDAY: 2, ... },
  maxOffDaysPerMonth: { 1: 5, 2: 5, ... }
});
```

---

### Shop Management

#### updateShops(shops: Shop[])
**Purpose**: Replace shops array in state
**Usage**: Manual shop list update
```typescript
teamStore.updateShops(newShops);
```

#### async loadShops()
**Purpose**: Load shops for current user's team
**Flow**:
1. Get teamId from user store
2. Call `fetchShopsByTeamId()`
3. Update `shops` state

**Usage**:
```typescript
await teamStore.loadShops();
```

**Error Handling**:
- Sets `error` state on failure
- Throws error for component to handle

---

#### async fetchShopsByTeamId(teamId: number)
**Purpose**: Fetch shops for specific team
**API Call**: `apiTeamShop.getShopsByTeamId(teamId)`
**Loading State**: Sets `isLoadingShops` to true during fetch

**Usage**:
```typescript
await teamStore.fetchShopsByTeamId(123);
```

**Error Handling**:
- Logs error to console
- Sets `error` state with message
- Sets `isLoadingShops` to false
- Throws error

---

#### async createShop(teamId: number, shop: Shop)
**Purpose**: Create new shop and add to state
**API Call**: `apiTeamShop.createShop(teamId, shop)`
**Optimistic Update**: Adds new shop to `shops` array

**Usage**:
```typescript
await teamStore.createShop(123, {
  name: 'Main Office',
  address: '123 Main St'
});
```

**Error Handling**: Throws error for component to catch

---

#### async updateShop(teamId: number, shopId: number, shop: Shop)
**Purpose**: Update existing shop in state
**API Call**: `apiTeamShop.updateShop(teamId, shopId, shop)`
**Optimistic Update**: Updates shop in `shops` array by ID

**Usage**:
```typescript
await teamStore.updateShop(123, 456, {
  name: 'Updated Name',
  address: 'New Address'
});
```

**Error Handling**: Throws error for component to catch

---

#### async deleteShop(teamId: number, shopId: number)
**Purpose**: Delete shop from state
**API Call**: `apiTeamShop.deleteShop(teamId, shopId)`
**Optimistic Update**: Removes shop from `shops` array

**Usage**:
```typescript
await teamStore.deleteShop(123, 456);
```

**Error Handling**: Throws error for component to catch

---

### Join Request Management

#### requestJoinTeam(request: JoinRequest)
**Purpose**: Add join request to selected team
**Usage**: After submitting join request
```typescript
teamStore.requestJoinTeam({
  userId: 1,
  teamId: 123,
  message: 'Please let me join',
  status: 'PENDING'
});
```

**Important**: Only updates local state if `selectedTeam` exists

---

### Team Fetching

#### async fetchTeams(params?: Partial<Team>)
**Purpose**: Fetch teams with optional filters
**API Call**: `apiTeam.getTeams(params)`
**Pagination**: Supports paginated responses

**Usage**:
```typescript
// Fetch all teams
await teamStore.fetchTeams();

// Fetch with filters
await teamStore.fetchTeams({ name: 'Engineering' });
```

**Response Handling**:
- Extracts `content` array from paginated response
- Sets `teams` state
- Sets `teamsTotalCount` for pagination

**Error Handling**:
- Logs error to console
- Sets `error` state with message
- Throws error

---

## 🔍 Getters

### getTeamById(id: number): Team | undefined
**Purpose**: Find team by ID in `teams` array
**Usage**:
```typescript
const team = teamStore.getTeamById(123);
```

**Returns**: Team object or undefined if not found

---

### getTeamMembers: TeamMember[]
**Purpose**: Get team members for selected team
**Usage**:
```typescript
const members = teamStore.getTeamMembers;
```

**Returns**: Array of team members

---

### getScheduleConfig: ScheduleConfig
**Purpose**: Get schedule configuration
**Usage**:
```typescript
const config = teamStore.getScheduleConfig;
```

**Returns**: Schedule configuration object

---

### getShops: Shop[]
**Purpose**: Get shops for selected team
**Usage**:
```typescript
const shops = teamStore.getShops;
```

**Returns**: Array of shops

---

### getShopOptions: Array<{ label: string, value: number }>
**Purpose**: Get shops formatted for Quasar select dropdown
**Usage**:
```typescript
<q-select :options="teamStore.getShopOptions" />
```

**Returns**: Array of objects with `label` (shop name) and `value` (shop ID)

---

## 🏗️ Usage Patterns

### Typical Component Integration

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useTeamStore } from '@/stores/workschd/store_team';

const teamStore = useTeamStore();

// Fetch teams on component mount
onMounted(async () => {
  await teamStore.fetchTeams();
});

// Select team and load shops
async function selectTeam(teamId: number) {
  await teamStore.setTeam(teamId);
}

// Access state reactively
const teams = computed(() => teamStore.teams);
const shops = computed(() => teamStore.getShops);
</script>

<template>
  <q-select
    :options="teams"
    @update:model-value="selectTeam"
  />

  <div v-for="shop in shops" :key="shop.id">
    {{ shop.name }}
  </div>
</template>
```

---

### Shop Management Pattern

```typescript
// Component for managing shops (TeamManageShop.vue)
const teamStore = useTeamStore();

// Load shops on mount
onMounted(async () => {
  if (teamStore.selectedTeam) {
    await teamStore.fetchShopsByTeamId(teamStore.selectedTeam.id);
  }
});

// Create shop
async function createShop(shop: Shop) {
  try {
    await teamStore.createShop(teamStore.selectedTeam.id, shop);
    $q.notify({ type: 'positive', message: 'Shop created' });
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to create shop' });
  }
}

// Update shop
async function updateShop(shopId: number, shop: Shop) {
  await teamStore.updateShop(teamStore.selectedTeam.id, shopId, shop);
}

// Delete shop
async function deleteShop(shopId: number) {
  await teamStore.deleteShop(teamStore.selectedTeam.id, shopId);
}
```

---

### Team Selection Pattern

```typescript
// Pattern used in TeamManage.vue
const teamStore = useTeamStore();
const selectedTeamId = ref<number | null>(null);

// Watch for team selection changes
watch(selectedTeamId, async (newTeamId) => {
  if (newTeamId) {
    await teamStore.setTeam(newTeamId);
    // Shops are automatically loaded by setTeam()
  }
});
```

---

## 🔄 State Persistence

**Current Implementation**: No persistence (state resets on page refresh)

**Recommended Enhancement**:
Consider adding Pinia persist plugin to save selected team to localStorage:

```typescript
import { defineStore } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

export const useTeamStore = defineStore('team', {
  state: () => ({ ... }),
  persist: {
    key: 'workschd-team',
    storage: localStorage,
    paths: ['selectedTeam', 'teams']
  }
});
```

---

## 🧪 Testing Recommendations

When testing the team store:

**Setup**:
```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useTeamStore } from './store_team';

beforeEach(() => {
  setActivePinia(createPinia());
});
```

**Test Actions**:
```typescript
it('should set selected team', () => {
  const store = useTeamStore();
  const team = { id: 1, name: 'Test Team' };

  store.setSelectedTeam(team);

  expect(store.selectedTeam).toEqual(team);
});
```

**Test Async Actions**:
```typescript
it('should fetch teams', async () => {
  const store = useTeamStore();
  vi.spyOn(apiTeam, 'getTeams').mockResolvedValue({
    data: { content: [{ id: 1, name: 'Team 1' }], totalElements: 1 }
  });

  await store.fetchTeams();

  expect(store.teams).toHaveLength(1);
  expect(store.teamsTotalCount).toBe(1);
});
```

**Test Getters**:
```typescript
it('should get team by id', () => {
  const store = useTeamStore();
  store.teams = [
    { id: 1, name: 'Team 1' },
    { id: 2, name: 'Team 2' }
  ];

  const team = store.getTeamById(1);

  expect(team?.name).toBe('Team 1');
});
```

---

## 🚀 Adding New Stores

When creating a new Pinia store:
1. Create file: `store_{feature}.ts`
2. Define state interface
3. Use `defineStore()` with store name
4. Implement state, actions, getters
5. Add TypeScript types for all methods
6. Handle loading and error states
7. Integrate with API modules
8. Add JSDoc comments
9. Update this agents.md file

Example template:
```typescript
import { defineStore } from 'pinia';

interface MyState {
  items: Item[];
  loading: boolean;
  error: string | null;
}

export const useMyStore = defineStore('my-feature', {
  state: (): MyState => ({
    items: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchItems() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiMyFeature.getItems();
        this.items = response.data;
      } catch (error) {
        this.error = 'Failed to fetch items';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  },

  getters: {
    getItemById: (state) => (id: number) => {
      return state.items.find(item => item.id === id);
    }
  }
});
```

---

## 📚 Related Documentation

- **API Clients**: `../../api/workschd/agents.md` - API methods called by store actions
- **Views**: `../../views/workschd/agents.md` - Components using this store
- **Types**: `../../types/workschd/` - TypeScript interfaces for state
- **Pinia Docs**: https://pinia.vuejs.org/ - Official Pinia documentation
