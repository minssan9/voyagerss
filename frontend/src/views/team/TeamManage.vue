<template>
  <q-page class="q-pa-md page-container">
    <div class="row q-mb-md justify-between items-center">
      <h5 class="q-my-none">{{ t('team.manage.title', 'Team Management') }}</h5>
      <div>
        <q-btn 
          :label="t('team.manage.registerNewTeam', 'Register New Team')" 
          color="primary" 
          @click="showRegistrationDialog = true"
          class="q-mr-sm"
        />        
        <q-btn
          :label="t('team.manage.refreshTeams', 'Refresh')"
          color="secondary"
          icon="refresh"
          @click="fetchTeams"
          flat
        />
      </div>
    </div>

    <!-- Team Grid -->
    <div class="content-section q-pa-md q-mb-md">
      <GridDefault
          style="width: 100%; height: 200px"
          :columnDefs="columnDefs"
          :rowData="teams"
          @grid-ready="onGridReady"
          :gridOptions="gridOptions"
          class="ag-theme-alpine-dark"
      />
      
      <!-- Team Pagination -->
      <Pagination
        :total-items="teamsTotalCount"
        :initial-page="1"
        :initial-page-size="10"
        @page-change="onTeamPageChange"
      />
    </div>

    <!-- Team Details Section -->
    <div v-if="selectedTeamForDetails" class="content-section q-pa-md q-mt-md">
      <div class="row justify-between items-center q-mb-md">
        <h5 class="q-my-none">{{ t('team.manage.teamDetails', 'Team Details') }}: {{ selectedTeamForDetails.name }}</h5>
        <q-tabs
          v-model="activeTab"
          class="text-primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="members" :label="t('team.manage.tabs.members', 'Members')" />
          <q-tab name="shop" :label="t('team.manage.tabs.shop', 'Shop')" />
          <q-tab name="accountWorkHour" :label="t('team.manage.tabs.accountWorkHour', 'Schedule Config')" />
        </q-tabs>
      </div>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="members">
          <TeamMembersGrid
            :team-id="selectedTeamForDetails.id"
            :members="teamMembers"
            :total-count="membersTotalCount"
            :page-request="membersPageRequest"
            @grid-ready="onMemberGridReady"
            @page-change="onMemberPageChange"
            @row-clicked="onMemberRowClicked" 
          />
          <MemberDialog v-model="isMemberDialogOpen" :member="selectedMember" />
        </q-tab-panel>
        <q-tab-panel name="shop">
          <TeamManageShop :team-id="selectedTeamForDetails.id" />
        </q-tab-panel>
        <q-tab-panel name="accountWorkHour">
          <TeamScheduleConfig :team-id="selectedTeamForDetails.id" />
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Registration Dialog -->
    <TeamRegistrationDialog
      v-model="showRegistrationDialog"
      @team-registered="onTeamRegistered"
    />

    <!-- Approval Dialog -->
    <TeamApproveDialog
      v-model="approvalDialog"
      :selected-team="selectedTeam"
      @request-approved="handleRequestApproved"
    />
  </q-page>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useQuasar} from 'quasar'
import {useI18n} from 'vue-i18n'
import TeamApproveDialog from './dialog/TeamApproveDialog.vue'
import TeamRegistrationDialog from './dialog/TeamRegistrationDialog.vue'
import TeamScheduleConfig from './subpage/TeamManageScheduleConfig.vue'
import TeamManageShop from './subpage/TeamManageShop.vue'
import GridDefault from '@/components/grid/GridDefault.vue'
import Pagination from '@/components/common/Pagination.vue'
import apiTeam, {TeamDTO, TeamMemberParams} from '@/api/modules/api-team'
import { PageDTO } from '@/api/modules/api-common'
import MemberDialog from '@/components/dialog/MemberDialog.vue'
import TeamMembersGrid from './subpage/TeamMembers.vue'

// State
const $q = useQuasar()
const { t } = useI18n()
const showRegistrationDialog = ref(false)
const approvalDialog = ref(false)
const selectedTeam = ref<TeamDTO | null>(null)
const selectedTeamForDetails = ref<TeamDTO | null>(null)
const activeTab = ref('members')
const teamMembers = ref<TeamDTO[]>([])
const teams = ref<TeamDTO[]>([])

// Pagination state
const teamsTotalCount = ref(0)
const membersTotalCount = ref(0)
const teamsPageRequest = ref<PageDTO>({
  page: 0,
  size: 10,
  sort: 'id,desc'
})
const membersPageRequest = ref<PageDTO>({
  page: 0,
  size: 10,
  sort: 'id,desc'
})

// Grid Configuration
const columnDefs = ref([
  { 
    headerName: t('team.manage.grid.teamName', 'Team Name'), 
    field: 'name',
    cellRenderer: (params: any) => {
      return `<div class="clickable-cell">${params.value}</div>`;
    },
    onCellClicked: (params: any) => {
      selectedTeamForDetails.value = params.data;
      activeTab.value = 'members';
      // Reset members pagination when selecting a new team
      membersPageRequest.value = {
        page: 0,
        size: 10,
        sort: 'id,desc'
      };
      onMemberGridReady();
    }
  },
  { headerName: t('team.manage.grid.region', 'Region'), field: 'region' },
  { headerName: t('team.manage.grid.scheduleType', 'Schedule Type'), field: 'scheduleType' },
  { headerName: t('team.manage.grid.members', 'Members'), field: 'memberCount' },
  { headerName: t('team.manage.grid.pendingRequests', 'Pending Requests'), field: 'joinRequests', valueGetter: (params: any) => params.data.joinRequests?.length || 0 },
  { headerName: t('team.manage.grid.createdAt', 'Created At'), field: 'createdAt' },
  { 
    headerName: t('team.manage.grid.inviteLink', 'Invite Link'), 
    field: 'id',
    cellRenderer: (params: any) => {
      return `
        <button
          class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--rectangle text-primary q-btn--actionable q-focusable q-hoverable"
        >
          <i class="material-icons q-icon">content_copy</i>
          ${t('team.manage.grid.copyInvite', 'Copy Invite Link')}
        </button>
      `;
    },
    onCellClicked: (params: any) => {
      generateAndCopyInviteLink(params.data);
    }
  },
  { headerName: t('team.manage.grid.actions', 'Actions'),
    cellRenderer: (params: any) => {
      const hasRequests = params.data.joinRequests?.length > 0
      return `
        <button
          class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--rectangle text-primary q-btn--actionable q-focusable q-hoverable"
          ${!hasRequests ? 'disabled' : ''}
        >
          ${t('team.manage.grid.viewRequests', 'View Requests')}
        </button>
      `
    },
    onCellClicked: (params: any) => {
      if (params.data.joinRequests?.length > 0) {
        selectedTeam.value = params.data
        approvalDialog.value = true
      }
    }
  }
])

// Grid options
const gridOptions = ref({
  pagination: false,
  rowSelection: 'single'
})

// New state for MemberDialog
const isMemberDialogOpen = ref(false)
const selectedMember = ref<any>(null)

// Methods
const onGridReady = () => {  
  teamsPageRequest.value.page = 0
  teamsPageRequest.value.size = 10
  teamsPageRequest.value.sort = 'id,desc'

  fetchTeams();
}

const fetchTeams = (params?: Partial<TeamDTO>) => { 
  const requestParams: TeamDTO = { 
    page: teamsPageRequest.value.page,
    size: teamsPageRequest.value.size,
    ...params 
  };
  
  // Handle sort parameter in the format expected by Spring's Pageable
  // Spring expects: sort=property,direction
  if (teamsPageRequest.value.sort) {
    const sortParts = teamsPageRequest.value.sort.split(',');
    if (sortParts.length === 2) {
      requestParams.sort = `${sortParts[0]},${sortParts[1]}`;
    }
  }

  apiTeam.getTeams(requestParams) 
    .then(response => {
      if (response.data.content) {
        teams.value = response.data.content;
        teamsTotalCount.value = response.data.totalElements;
      }
    })
    .catch(error => $q.notify({ type: 'negative', message: 'Failed to fetch teams' }));
}

const onTeamPageChange = (pageRequest: PageDTO) => {
  teamsPageRequest.value = pageRequest;
  fetchTeams();
}

const onMemberGridReady = () => {
  if (!selectedTeamForDetails.value) return;
  
  fetchTeamMembers();
}

const fetchTeamMembers = (params?: TeamMemberParams) => {
  teamMembers.value = []
  if (!selectedTeamForDetails.value) return;
  
  // Create a new params object if one wasn't provided
  const requestParams: TeamMemberParams = params || {};
  
  // Set pagination properties
  requestParams.page = membersPageRequest.value.page;
  requestParams.size = membersPageRequest.value.size;
  
  // Handle sort parameter in the format expected by Spring's Pageable
  if (membersPageRequest.value.sort) {
    const sortParts = membersPageRequest.value.sort.split(',');
    if (sortParts.length === 2) {
      requestParams.sort = `${sortParts[0]},${sortParts[1]}`;
    }
  }
  
  // Load team members for the selected team
  apiTeam.getTeamMembers(selectedTeamForDetails.value.id, requestParams)
    .then(response => {      
      teamMembers.value = response.data;     
    })
    .catch(error => console.error('Failed to fetch team members:', error));
}

const onMemberPageChange = (pageRequest: PageDTO) => {
  membersPageRequest.value = pageRequest;
  fetchTeamMembers();
}

const onTeamRegistered = (team: TeamDTO) => {
  // Refresh the teams list to include the new team
  fetchTeams();
  
  // Select the newly registered team and show its details
  selectedTeamForDetails.value = team;
  activeTab.value = 'members';
  
  // Reset members pagination
  membersPageRequest.value = {
    page: 0,
    size: 10,
    sort: 'id,desc'
  };
  onMemberGridReady();
}

const handleRequestApproved = ({ teamId, request }: { teamId: number, request: TeamDTO }) => {
  try {
    // Remove request from the list
    const teamIndex = teams.value.findIndex(t => t.id === teamId)
    if (teamIndex !== -1) {
      const requestIndex = teams.value[teamIndex].joinRequests?.findIndex(
        r => r.id === request.id
      ) ?? -1;
      if (requestIndex !== -1 && teams.value[teamIndex].joinRequests) {
        teams.value[teamIndex].joinRequests?.splice(requestIndex, 1)
      }
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to approve request'})
  }
}

// Function to generate and copy invite link
const generateAndCopyInviteLink = async (team: TeamDTO) => {  
  const inviteLink = `${window.location.origin}/team/join/${team.invitationHash}`;
  
  // Copy to clipboard
  await navigator.clipboard.writeText(inviteLink);
  
  // Show success notification
  $q.notify({ type: 'positive', message: t('team.manage.inviteLinkCopied', 'Invite link copied to clipboard'), timeout: 2000 });  
}

function onMemberRowClicked(params: any) {
  selectedMember.value = params.data
  isMemberDialogOpen.value = true
}

// Lifecycle
onMounted(() => {
  onGridReady()
})
</script>

<style scoped>
.ag-theme-alpine {
  width: 100%;
}

.clickable-cell {
  cursor: pointer;
  color: var(--q-primary);
  text-decoration: underline;
}
</style>