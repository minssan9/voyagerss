<template>
  <q-page padding class="page-container">
    <div class="content-section q-pa-md">
      <div class="row justify-center">
        <div class="col-12 col-md-8">
          <h1 class="text-h4 q-mb-lg">{{ t('terms.title', '이용약관') }}</h1>
          
          <div class="text-body1">
            <section v-for="(section, index) in sections" :key="index" class="q-mb-xl">
              <h2 class="text-h5 q-mb-md">{{ t(`terms.sections.${index}.title`, section.title) }}</h2>
              <p v-for="(content, idx) in section.content" :key="idx" class="q-mb-md">
                {{ t(`terms.sections.${index}.content.${idx}`, content) }}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const sections = [
  {
    title: '제1조 (목적)',
    content: [
      '이 약관은 회사가 제공하는 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.'
    ]
  },
  // Add more sections as needed
]
</script> 