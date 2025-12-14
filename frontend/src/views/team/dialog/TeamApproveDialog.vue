<template>
  <q-dialog v-model="isOpen">
    <q-card class="dialog-card medium">
      <q-card-section class="dialog-title">
        <div class="text-h6">Approve Join Requests</div>
      </q-card-section>

      <q-card-section class="dialog-content">
        <q-list dense>
          <q-item v-for="request in selectedTeam?.joinRequests" :key="request.id" class="dialog-list-item">
            <q-item-section>
              <q-item-label>{{ request.userName }}</q-item-label>
              <q-item-label caption>{{ request.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                label="Approve"
                color="positive"
                dense
                @click="handleApprove(request)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions class="dialog-actions">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import apiTeam, { TeamDTO as Team, JoinRequest } from '@/api/modules/api-team'
import { useTeamStore } from '@/stores/modules/store_team'

const $q = useQuasar()
const emit = defineEmits(['request-approved'])
const isOpen = defineModel('modelValue')

const teamStore = useTeamStore()

const props = defineProps<{
  selectedTeam: Team | null
}>()

const handleApprove = async (request: JoinRequest) => {
  try {
    if (!props.selectedTeam) return

    await apiTeam.approveRequest(props.selectedTeam.id, request)

    emit('request-approved', { teamId: props.selectedTeam.id, request })
    $q.notify({ type: 'positive', message: 'Request approved successfully' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to approve request' })
  }
}
</script> 