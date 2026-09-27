<template>
  <WorkschdPage :title="t('team.joinPage.title')" :subtitle="t('team.joinPage.subtitle')" test-id="team-join-page">
    <div class="row justify-center">
      <div class="col-12 col-md-6">
        <q-card class="content-section">
          <q-card-section>
            <div class="text-h6">{{ t('team.join.title') }}</div>
            <div v-if="loading" class="text-center q-pa-md" data-testid="team-join-loading">
              <q-spinner color="primary" size="3em" />
              <div class="q-mt-sm">{{ t('team.join.processing') }}</div>
            </div>
            
            <div v-else-if="error" class="text-center q-pa-md" data-testid="team-join-error">
              <q-icon name="error" color="negative" size="3em" />
              <div class="text-negative q-mt-sm">{{ error }}</div>
              <q-btn
                flat
                color="primary"
                class="q-mt-md"
                :label="t('common.backToHome')"
                @click="router.push({ name: 'home' })"
              />
            </div>
            
            <div v-else-if="pending" class="text-center q-pa-md" data-testid="team-join-pending">
              <q-icon name="hourglass_top" color="warning" size="3em" />
              <div class="text-warning q-mt-sm">
                {{ t('team.join.pending') }}
              </div>
              <div v-if="teamName" class="q-mt-sm text-grey-7">{{ teamName }}</div>
            </div>

            <div v-else-if="alreadyMember" class="text-center q-pa-md" data-testid="team-join-already-member">
              <q-icon name="group" color="info" size="3em" />
              <div class="text-info q-mt-sm">
                {{ t('team.join.alreadyMember') }}
              </div>
            </div>
            
            <div v-else-if="success" class="text-center q-pa-md" data-testid="team-join-success">
              <q-icon name="check_circle" color="positive" size="3em" />
              <div class="text-positive q-mt-sm">
                {{ t('team.join.success') }}
              </div>
              <q-btn
                flat
                color="primary"
                class="q-mt-md"
                :label="t('team.manage.viewTeam')"
                @click="router.push({ name: 'TeamManage' })"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </WorkschdPage>
</template>

<script setup lang="ts">
import WorkschdPage from '@/modules/workschd/components/WorkschdPage.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/common/store_user'
import { useI18n } from 'vue-i18n'
import apiTeam from '@/modules/workschd/api/api-team'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()

const loading = ref(true)
const error = ref('')
const success = ref(false)
const pending = ref(false)
const alreadyMember = ref(false)
const teamName = ref('')

const processInvitation = async () => {
  const invitationHash = route.params.token as string
  const accountId = userStore.user.accountId
  
  if (!accountId) {
    const returnUrl = window.location.pathname
    router.push({ 
      name: 'login', 
      query: { redirect: returnUrl }
    })
    return
  }

  try {
    const response = await apiTeam.joinTeamByInvitation(invitationHash)
    const envelope = response.data

    if (envelope?.result === 'SUCCESS' && envelope.data) {
      teamName.value = envelope.data.teamName || ''
      if (envelope.data.status === 'pending') {
        pending.value = true
        $q.notify({ type: 'info', message: t('team.join.pending') })
      } else if (envelope.data.status === 'already-member') {
        alreadyMember.value = true
      } else {
        success.value = true
        $q.notify({ type: 'positive', message: t('team.join.success') })
      }
    } else {
      success.value = true
    }
  } catch (err: any) {
    error.value = err.response?.data?.message
      || (err instanceof Error ? err.message : t('team.join.error'))
    $q.notify({ type: 'negative', message: error.value })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  processInvitation()
})
</script>
