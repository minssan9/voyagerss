<template>
  <q-page padding class="modern-page page-container">
    <div class="modern-bg__pattern absolute-full"></div>
    
    <!-- Header Section -->
    <div class="modern-page__header fade-in">
      <div class="row justify-center items-center">
        <div class="col-12 col-md-10 text-center">
          <h1 class="modern-text__title q-mb-md text-h4">{{ t('about.overview.title', '서비스 개요') }}</h1>
          <p class="modern-text__subtitle q-mb-xl">{{ t('about.overview.subtitle', '효율적인 근무 관리를 위한 스케줄 자동화 솔루션을 소개합니다') }}</p>
        </div>
      </div>
    </div>
    
    <div class="modern-page__content">
      <div class="row q-col-gutter-lg">
        <!-- Service Overview -->
        <div class="col-12">
          <div class="modern-card slide-up stagger-1">
            <div class="modern-card__body">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <div class="row q-gutter-y-md">
                    <q-item v-for="(feature, index) in 3" :key="index" class="modern-bg__glass q-my-sm" style="border-radius: 12px;">
                      <q-item-section avatar>
                        <q-avatar :style="`background: ${['#4361ee', '#3a0ca3', '#4cc9f0'][index]}`" text-color="white">{{ index + 1 }}</q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <p>{{ t(`about.overview.feature${index + 1}`, ['직관적인 인터페이스', '실시간 동기화', '맞춤형 옵션'][index]) }}</p>
                      </q-item-section>
                    </q-item>
                  </div>
                </div>
                <div class="col-12 col-md-6 flex flex-center">
                  <q-img src="https://placehold.co/400x300" class="rounded-borders q-mt-md" style="border-radius: 16px; box-shadow: var(--shadow-lg);" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Features -->
        <div class="col-12 q-mt-xl">
          <h2 class="modern-text__title text-h5 q-mb-md text-center">{{ t('about.features.title', '주요 기능') }}</h2>
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-4" v-for="i in 3" :key="i">
              <div class="modern-card slide-up" :class="`stagger-${i+1}`">
                <div class="modern-card__header" :style="`background: ${['#4361ee', '#3a0ca3', '#4cc9f0'][i-1]}; color: white;`">
                  <h3 class="text-h6 q-mb-sm">{{ t(`about.features.feature${i}`, ['스케줄 자동화', '실시간 알림', '보고서 생성'][i-1]) }}</h3>
                </div>
                <div class="modern-card__body">
                  <p>{{ t(`about.features.feature${i}.description`, ['직원 근무 패턴을 학습하여 최적의 스케줄을 자동으로 생성합니다.', '근무 시간 변경, 승인 요청 등의 알림을 실시간으로 전송합니다.', '근태 관리, 시간 외 근무 등의 보고서를 손쉽게 생성할 수 있습니다.'][i-1]) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing -->
        <div class="col-12 q-mt-xl">
          <div class="modern-card slide-up stagger-5">
            <div class="modern-card__header">
              <h2 class="modern-text__title text-h5 q-mb-md">{{ t('about.pricing.title', '요금 정책') }}</h2>
            </div>
            <div class="modern-card__body">
              <q-table
                :rows="pricingRows"
                :columns="pricingColumns"
                row-key="type"
                flat
                bordered
                class="modern-table"
              />
            </div>
          </div>
        </div>

        <!-- Customer Feedback -->
        <div class="col-12 q-mt-xl">
          <div class="modern-card slide-up stagger-6">
            <div class="modern-card__header" style="background: linear-gradient(145deg, #4cc9f0, #4361ee); color: white;">
              <h2 class="modern-text__title text-h5 q-mb-md">{{ t('about.customerFeedback.title', '고객 후기') }}</h2>
            </div>
            <div class="modern-card__body">
              <div class="row q-col-gutter-lg">
                <div class="col-12 col-md-6 flex flex-center">
                  <div class="modern-bg__glass q-pa-md" style="border-radius: 16px;">
                    <p class="text-body1 q-py-lg q-px-md" style="font-style: italic;">{{ t('about.customerFeedback.quote', '이전에는 팀의 스케줄 관리를 하는 것이 너무 복잡했지만, 이 서비스를 사용한 후 정말 편리해졌어요...') }}</p>
                    <div class="text-right q-pr-md">
                      <p class="text-weight-bold q-mb-none">김지연</p>
                      <p class="text-caption">인사팀 매니저</p>
                    </div>
                  </div>
                </div>
                <div class="col-12 col-md-6 flex flex-center">
                  <q-img src="https://placehold.co/300x300" class="rounded-borders" style="border-radius: 16px; box-shadow: var(--shadow-lg);" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modern-page__footer">
      <div class="row">
        <div class="col-12 text-center">
          <p>{{ t('about.footer.copyright', '© 2024 Work Schedule Automation Service. All rights reserved.') }}</p>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'

const { t } = useI18n()

const pricingColumns = [
  { name: 'type', label: t('about.pricing.criteria', '기준'), field: 'type', align: 'left' as const },
  { name: 'standard', label: t('about.pricing.standard', 'Standard'), field: 'standard', align: 'center' as const },
  { name: 'premium', label: t('about.pricing.premium', 'Premium'), field: 'premium', align: 'center' as const }
]

const pricingRows = [
  { type: t('about.pricing.team10', '10인 이하 팀'), standard: '$9/user', premium: '$25/user' },
  { type: t('about.pricing.team10to50', '10-50인 팀'), standard: '$15/user', premium: '$25/user' },
  { type: t('about.pricing.team50', '50인 이상 팀'), standard: '$25/user', premium: '$25/user' }
]
</script>

<style lang="scss">
// Local styles
.modern-table {
  border-radius: $radius-lg;
  overflow: hidden;
  
  th {
    font-weight: 600;
    background-color: rgba(67, 97, 238, 0.05);
  }
  
  tr:nth-child(even) {
    background-color: rgba(76, 201, 240, 0.03);
  }
  
  tr:hover {
    background-color: rgba(67, 97, 238, 0.08);
  }
}

.q-footer {
  margin-top: 0 !important;
}
</style>