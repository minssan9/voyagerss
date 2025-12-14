<template>
  <q-drawer 
    side="right" 
    v-model="drawerRight"
    :width="200" 
    :breakpoint="700" 
    bordered
    @update:model-value="layoutStore.setRightDrawer"
  >
    <div class="drawer-header">      
      <div class="row ">      
        <div class="col-12" v-if="userStore.user.accountId">
          <q-avatar size="32px">
            <img :src="userStore.user.profileImageUrl" />
          </q-avatar>
          <span class="q-ml-sm">{{ userStore.user.username || 'Guest' }}</span>
        </div>
        <div class="col-12">
          <q-list>
            <q-item v-if="!userStore.user.accountId" clickable v-ripple :to="{ name: 'login' }">
              <q-item-section avatar>
                <q-icon name="login" />
              </q-item-section>
              <q-item-section>Login</q-item-section>
            </q-item>
            <q-item v-else clickable v-ripple @click="logout">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>Logout</q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>

    <q-scroll-area class="drawer-side">
      <q-list padding >
        <!-- Account Section -->
        <div v-if="userStore.user.accountId">
          <q-item-label header>Account</q-item-label>
          <q-item clickable v-ripple :to="{ name: 'AccountProfile' }">
            <q-item-section avatar>
              <q-icon name="person" />
            </q-item-section>
            <q-item-section>Profile</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'AccountSchedule' }">
            <q-item-section avatar>
              <q-icon name="person" />
            </q-item-section>
            <q-item-section>Account Schedule</q-item-section>
          </q-item>
          
          <!-- Team Selector -->
          <q-item>
            <q-item-section avatar>
              <q-icon name="groups" />
            </q-item-section>
            <q-item-section>
              <q-select
                v-model="selectedTeam"
                :options="teamOptions"
                dense
                outlined
                emit-value
                map-options
                label="Select Team"
                @update:model-value="handleTeamChange"
              />
            </q-item-section>
          </q-item>
        </div>
        <!-- Settings Section -->
        <q-item-label header>Settings</q-item-label>
        
        <!-- Language Selector -->
        <q-item>
          <q-item-section avatar>
            <q-icon name="language" />
          </q-item-section>
          <q-item-section>
            <q-select
              v-model="locale"
              :options="languageOptions"
              dense
              outlined
              emit-value
              map-options
            />
          </q-item-section>
        </q-item>

        <!-- Theme Toggle -->
        <q-item clickable v-ripple @click="toggleDarkMode">
          <q-item-section avatar>
            <q-icon :name="$q.dark.isActive ? 'light_mode' : 'dark_mode'" />
          </q-item-section>
          <q-item-section>
            {{ $q.dark.isActive ? 'Light Mode' : 'Dark Mode' }}
          </q-item-section>
        </q-item>

        <!-- System Section -->
        <q-item-label header>System</q-item-label>
        <q-item clickable v-ripple @click="openHelp">
          <q-item-section avatar>
            <q-icon name="help" />
          </q-item-section>
          <q-item-section>Help</q-item-section>
        </q-item>
        
        <q-item clickable v-ripple @click="openFeedback">
          <q-item-section avatar>
            <q-icon name="feedback" />
          </q-item-section>
          <q-item-section>Feedback</q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>

    <div class="drawer-footer"> 
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLayoutStore } from '@/stores/modules/store_layout'
import { useUserStore } from '@/stores/modules/store_user'
import { useTeamStore } from '@/stores/modules/store_team'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()
const layoutStore = useLayoutStore()
const userStore = useUserStore()
const teamStore = useTeamStore()
const { drawerRight } = storeToRefs(layoutStore)
const { teamOptions } = storeToRefs(userStore)
const $q = useQuasar()
const { locale } = useI18n()

// Team selection
const selectedTeam = ref(userStore.user.teamId)

const handleTeamChange = (teamId: number | null) => {
  userStore.setTeam(teamId)
  teamStore.setTeam(teamId)
}

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Korean', value: 'ko' },
  { label: 'French', value: 'fr' }, 
  { label: 'Spanish', value: 'es' },
  { label: 'Japanese', value: 'ja' }
]

const toggleDarkMode = () => {
  $q.dark.set(!$q.dark.isActive)
}

const openHelp = () => {
  window.open(`${import.meta.env.VITE_API_WEB}/help`, '_blank')
}

const openFeedback = () => {
  window.open(`${import.meta.env.VITE_API_WEB}/feedback`, '_blank')
}

const logout = async () => {
  await userStore.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  userStore.fetchTeams();
})
</script>

<style scoped>
.drawer-header {
  padding: 12px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #ddd;
}

.drawer-side {
  height: calc(100vh - 250px);
}

.drawer-footer {
  position: fixed;
  bottom: 0;
  width: 200px;
  border-top: 1px solid #ddd;
}

:deep(.q-item__section--avatar) {
  min-width: 40px;
}
</style> 