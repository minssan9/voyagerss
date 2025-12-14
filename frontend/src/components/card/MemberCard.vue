<template>
  <q-card class="member-card q-pa-md">
    <div class="row items-center q-col-gutter-md">
      <div class="col-auto">
        <q-avatar size="64px" :src="member.avatarUrl" color="primary" text-color="white">
          <span v-if="!member.avatarUrl">{{ member.name?.charAt(0) }}</span>
        </q-avatar>
      </div>
      <div class="col">
        <div class="text-h6 q-mb-xs">{{ member.name }}</div>
        <div class="text-subtitle2 q-mb-xs">{{ member.role }}</div>
        <div class="text-caption text-grey-7">{{ member.email }}</div>
        <div class="q-mt-sm">
          <q-badge color="primary" class="q-mr-sm">{{ member.team }}</q-badge>
          <q-badge :color="member.status === 'active' ? 'positive' : 'negative'">
            {{ member.status === 'active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive') }}
          </q-badge>
        </div>
        <div class="q-mt-sm text-caption text-grey-6">
          {{ t('team.member.joinedAt', 'Joined') }}: {{ member.joinedAt }}
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps<{
  member: {
    id: number
    name: string
    email: string
    role: string
    team: string
    joinedAt: string
    status: string
    avatarUrl?: string
  }
}>()
</script>

<style scoped lang="scss">
.member-card {
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(67, 97, 238, 0.08);
  background: white;
  min-width: 280px;
}
</style> 