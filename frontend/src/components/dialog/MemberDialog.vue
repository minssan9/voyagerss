<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="member-dialog-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ t('team.member.info', 'Member Information') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup @click="closeDialog" />
      </q-card-section>
      <q-card-section>
        <MemberCard :member="member" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat :label="t('common.close', 'Close')" color="primary" v-close-popup @click="closeDialog" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MemberCard from '../card/MemberCard.vue'

const props = defineProps<{
  modelValue: boolean
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
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, v => (isOpen.value = v))
watch(isOpen, v => emit('update:modelValue', v))

function closeDialog() {
  isOpen.value = false
}
</script>

<style scoped>
.member-dialog-card {
  width: 400px;
  max-width: 90vw;
}
</style> 