<template>
  <q-page padding class="page-container">
    <div class="content-section q-pa-md">
      <div class="row justify-center">
        <div class="col-12 col-md-8">
          <h1 class="text-h4 q-mb-lg">{{ t('privacy.title', '개인정보처리방침') }}</h1>
          
          <div class="text-body1">
            <!-- Privacy Policy Content -->
            <section v-for="(section, index) in sections" :key="index" class="q-mb-xl">
              <h2 class="text-h5 q-mb-md">{{ t(`privacy.sections.${index}.title`, section.title) }}</h2>
              <p v-for="(content, idx) in section.content" :key="idx" class="q-mb-md">
                {{ t(`privacy.sections.${index}.content.${idx}`, content) }}
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
    title: '1. 개인정보의 처리 목적',
    content: [
      '회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.',
      '서비스 제공, 계약의 이행, 요금정산과 같은 기본적인 서비스 제공을 위한 필수 정보를 처리합니다.'
    ]
  },
  // Add more sections as needed
]
</script> 