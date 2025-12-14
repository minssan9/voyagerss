<template>
  <q-page padding class="page-container">
    <div class="row justify-center">
      <div class="col-12 col-md-6">
        <q-card class="content-section">
          <q-card-section>
            <div class="text-h6">{{ t('team.join.title', 'Join Team') }}</div>
            <div v-if="loading" class="text-center q-pa-md">
              <q-spinner color="primary" size="3em" />
              <div class="q-mt-sm">{{ t('team.join.processing', 'Processing invitation...') }}</div>
            </div>
            
            <div v-else-if="error" class="text-center q-pa-md">
              <q-icon name="error" color="negative" size="3em" />
              <div class="text-negative q-mt-sm">{{ error }}</div>
              <q-btn
                flat
                color="primary"
                class="q-mt-md"
                :label="t('common.backToHome', 'Back to Home')"
                @click="router.push({ name: 'home' })"
              />
            </div>
            
            <div v-else-if="success" class="text-center q-pa-md">
              <q-icon name="check_circle" color="positive" size="3em" />
              <div class="text-positive q-mt-sm">
                {{ t('team.join.success', 'Successfully joined the team!') }}
              </div>
              <q-btn
                flat
                color="primary"
                class="q-mt-md"
                :label="t('team.manage.viewTeam', 'View Team')"
                @click="router.push({ name: 'TeamManage' })"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/modules/store_user'
import { useI18n } from 'vue-i18n'
import apiTeam from '@/api/modules/api-team'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()

const loading = ref(true)
const error = ref('')
const success = ref(false)

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
    await apiTeam.joinTeamByInvitation(invitationHash, accountId)
    success.value = true
    $q.notify({type: 'positive',message: t('team.join.success', 'Successfully joined the team!')})
  } catch (err) {
    error.value = err instanceof Error 
      ? err.message 
      : t('team.join.error', 'Failed to process invitation')
    $q.notify({type: 'negative',message: error.value})
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  processInvitation()
})
</script>

<style scoped>
/* No additional styles needed as we're using global styles */
</style> 