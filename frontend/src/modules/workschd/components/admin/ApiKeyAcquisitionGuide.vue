<template>
  <div class="api-key-guide q-mt-sm q-pa-md rounded-borders bg-blue-grey-1" data-testid="api-key-acquisition-guide">
    <div class="text-subtitle2 q-mb-xs">{{ guide.title }}</div>
    <ol class="q-pl-md q-my-sm text-body2 guide-steps">
      <li v-for="(step, idx) in guide.steps" :key="idx">{{ step }}</li>
    </ol>
    <div class="q-mb-xs text-caption text-weight-medium">{{ t('systemConfig.guideOfficialLinks') }}</div>
    <ul class="q-pl-md q-my-none text-body2 guide-links">
      <li v-for="link in guide.links" :key="link.href">
        <a
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary"
          :data-testid="`guide-link-${configKey}`"
        >
          {{ link.label }}
        </a>
      </li>
    </ul>
    <ul v-if="guide.notes?.length" class="q-pl-md q-mt-sm q-mb-none text-caption text-grey-8">
      <li v-for="(note, idx) in guide.notes" :key="`n-${idx}`">{{ note }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { guideForConfigKey, type ApiKeyAcquisitionGuide } from '@/modules/workschd/config/api-key-acquisition-guides';

const props = defineProps<{
  configKey: string;
}>();

const { t } = useI18n();

const guide = computed((): ApiKeyAcquisitionGuide => {
  const found = guideForConfigKey(props.configKey);
  if (!found) {
    return {
      configKey: props.configKey,
      title: props.configKey,
      steps: [],
      links: [],
    };
  }
  return found;
});
</script>

<style scoped>
.guide-steps li,
.guide-links li {
  margin-bottom: 4px;
}
</style>
