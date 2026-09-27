<template>
  <q-page padding class="page-container">
    <div class="content-section q-pa-md">
      <div class="row justify-center">
        <div class="col-12 col-md-8">
          <h1 class="text-h4 q-mb-lg">{{ t('privacy.title') }}</h1>
          <div class="text-body1">
            <section v-for="(section, index) in sections" :key="index" class="q-mb-xl">
              <h2 class="text-h5 q-mb-md">{{ section.title }}</h2>
              <p v-for="(content, idx) in section.content" :key="idx" class="q-mb-md">{{ content }}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t, tm } = useI18n()
const sections = computed(() => tm('privacy.sections') as Array<{ title: string; content: string[] }>)
</script>
