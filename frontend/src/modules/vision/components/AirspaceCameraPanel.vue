<template>
  <div class="airspace-camera">
    <img
      v-if="live"
      :key="reloadKey"
      :src="url"
      class="airspace-camera__img"
      :alt="t('airspace.camera.alt')"
      data-test="airspace-camera"
      @error="onError"
    />
    <div v-else class="airspace-camera__empty" data-test="airspace-camera-empty">
      <q-icon name="videocam_off" size="32px" />
      <span>{{ t('airspace.camera.offline') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cameraStreamUrl } from '@/modules/vision/api/api-airspace'

const props = defineProps<{ live: boolean }>()
const { t } = useI18n()
const url = cameraStreamUrl()
const reloadKey = ref(0)

// The MJPEG connection ends when the edge drops; reopen it when frames return.
watch(() => props.live, (live, was) => {
  if (live && !was) reloadKey.value++
})

function onError() {
  setTimeout(() => reloadKey.value++, 2000)
}
</script>
