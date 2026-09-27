<template>
  <q-dialog v-model="isOpen" data-testid="team-approve-dialog">
    <q-card class="dialog-card medium">
      <q-card-section class="dialog-title">
        <div class="text-h6">Approve Join Requests</div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="dialog-content">
        <q-list dense>
          <q-item
            v-for="request in selectedTeam?.joinRequests"
            :key="request.id"
            class="dialog-list-item"
            :data-testid="`join-request-${request.id}`"
          >
            <q-item-section>
              <q-item-label>{{ request.userName }}</q-item-label>
              <q-item-label caption>{{ request.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-xs">
                <q-btn
                  label="Approve"
                  color="positive"
                  dense
                  data-testid="approve-join-request"
                  @click="handleApprove(request)"
                />
                <q-btn
                  label="Reject"
                  color="negative"
                  dense
                  flat
                  data-testid="reject-join-request"
                  @click="handleReject(request)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-if="!selectedTeam?.joinRequests?.length" class="text-grey-7" data-testid="no-pending-requests">
          No pending requests
        </div>
      </q-card-section>

      <q-card-actions class="dialog-actions">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import apiTeam, { TeamDTO as Team, JoinRequest } from '@/modules/workschd/api/api-team'

const $q = useQuasar()
const emit = defineEmits(['request-approved', 'request-rejected'])
const isOpen = defineModel('modelValue')

const props = defineProps<{
  selectedTeam: Team | null
}>()

const handleApprove = async (request: JoinRequest) => {
  try {
    if (!props.selectedTeam?.id) return

    await apiTeam.approveJoinRequest(props.selectedTeam.id, request.id!)

    emit('request-approved', { teamId: props.selectedTeam.id, request })
    $q.notify({ type: 'positive', message: 'Request approved successfully' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to approve request' })
  }
}

const handleReject = async (request: JoinRequest) => {
  try {
    if (!props.selectedTeam?.id) return

    await apiTeam.rejectJoinRequest(props.selectedTeam.id, request.id!)

    emit('request-rejected', { teamId: props.selectedTeam.id, request })
    $q.notify({ type: 'info', message: 'Request rejected' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to reject request' })
  }
}
</script>
