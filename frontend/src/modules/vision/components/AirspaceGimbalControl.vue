<template>
  <div class="airspace-gimbal">
    <div class="airspace-gimbal__state" data-test="airspace-gimbal-state">
      <span class="page-airspace__pill">{{ t(`airspace.gimbalMode.${gimbal?.mode ?? 'auto'}`) }}</span>
      <span v-if="gimbal?.mode === 'lock' && gimbal.lockId != null" class="page-airspace__pill">T{{ gimbal.lockId }}</span>
      <span v-if="pending" class="page-airspace__pill page-airspace__pill--pending" data-test="airspace-gimbal-pending">
        {{ t('airspace.control.pending', { seq: pending.seq }) }}
      </span>
    </div>

    <q-banner v-if="!canControl" dense rounded class="page-airspace__hint q-mb-sm">
      {{ t('airspace.control.loginRequired') }}
    </q-banner>

    <div class="airspace-gimbal__actions">
      <q-btn
        unelevated no-caps color="primary" icon="track_changes"
        :label="t('airspace.control.auto')" :disable="!canControl || busy"
        data-test="airspace-gimbal-auto" @click="emit('command', { mode: 'auto' })"
      />
      <q-btn
        outline no-caps icon="home"
        :label="t('airspace.control.home')" :disable="!canControl || busy"
        data-test="airspace-gimbal-home" @click="emit('command', { mode: 'home' })"
      />
    </div>

    <div class="airspace-gimbal__manual">
      <div class="airspace-gimbal__slider">
        <span>{{ t('airspace.control.pan') }} {{ pan }}°</span>
        <q-slider v-model="pan" :min="-90" :max="90" :step="1" label :disable="!canControl" />
      </div>
      <div class="airspace-gimbal__slider">
        <span>{{ t('airspace.control.tilt') }} {{ tilt }}°</span>
        <q-slider v-model="tilt" :min="-10" :max="90" :step="1" label :disable="!canControl" />
      </div>
      <q-btn
        outline no-caps icon="open_with"
        :label="t('airspace.control.point')" :disable="!canControl || busy"
        data-test="airspace-gimbal-manual" @click="emit('command', { mode: 'manual', pan, tilt })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AirspaceGimbal, GimbalCommand, GimbalCommandInput } from '@/modules/vision/api/api-airspace'

const props = defineProps<{
  gimbal: AirspaceGimbal | null
  pending: GimbalCommand | null
  canControl: boolean
  busy: boolean
}>()
const emit = defineEmits<{ command: [GimbalCommandInput] }>()
const { t } = useI18n()

const pan = ref(0)
const tilt = ref(20)
let touched = false

// Start the sliders at the live pose; stop following once the operator moves them.
watch(() => props.gimbal, (g) => {
  if (!g || touched) return
  pan.value = Math.round(g.pan)
  tilt.value = Math.round(g.tilt)
}, { immediate: true })
watch([pan, tilt], () => {
  if (props.gimbal && (pan.value !== Math.round(props.gimbal.pan) || tilt.value !== Math.round(props.gimbal.tilt))) {
    touched = true
  }
})
</script>
