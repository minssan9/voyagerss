<template>
  <q-page padding class="modern-page page-container">
    <div class="modern-bg__pattern absolute-full"></div>
    
    <!-- Header Section -->
    <div class="modern-page__header fade-in">
      <div class="row justify-center items-center">
        <div class="col-12 col-md-10 text-center">
          <h1 class="modern-text__title q-mb-md text-h4">{{ t('about.overview.title') }}</h1>
          <p class="modern-text__subtitle q-mb-xl">{{ t('about.overview.subtitle') }}</p>
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
                        <p>{{ t(`about.overview.feature${index + 1}`) }}</p>
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
          <h2 class="modern-text__title text-h5 q-mb-md text-center">{{ t('about.features.title') }}</h2>
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-4" v-for="i in 3" :key="i">
              <div class="modern-card slide-up" :class="`stagger-${i+1}`">
                <div class="modern-card__header" :style="`background: ${['#4361ee', '#3a0ca3', '#4cc9f0'][i-1]}; color: white;`">
                  <h3 class="text-h6 q-mb-sm">{{ t(`about.features.feature${i}.title`) }}</h3>
                </div>
                <div class="modern-card__body">
                  <p>{{ t(`about.features.feature${i}.description`) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing -->
        <div class="col-12 q-mt-xl">
          <div class="modern-card slide-up stagger-5">
            <div class="modern-card__header">
              <h2 class="modern-text__title text-h5 q-mb-md">{{ t('about.pricing.title') }}</h2>
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
              <h2 class="modern-text__title text-h5 q-mb-md">{{ t('about.customerFeedback.title') }}</h2>
            </div>
            <div class="modern-card__body">
              <div class="row q-col-gutter-lg">
                <div class="col-12 col-md-6 flex flex-center">
                  <div class="modern-bg__glass q-pa-md" style="border-radius: 16px;">
                    <p class="text-body1 q-py-lg q-px-md" style="font-style: italic;">{{ t('about.customerFeedback.quote') }}</p>
                    <div class="text-right q-pr-md">
                      <p class="text-weight-bold q-mb-none">{{ t('about.customerFeedback.authorName') }}</p>
                      <p class="text-caption">{{ t('about.customerFeedback.authorTitle') }}</p>
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
          <p>{{ t('about.footer.copyright') }}</p>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

const pricingColumns = computed(() => [
  { name: 'type', label: t('about.pricing.criteria'), field: 'type', align: 'left' as const },
  { name: 'standard', label: t('about.pricing.standard'), field: 'standard', align: 'center' as const },
  { name: 'premium', label: t('about.pricing.premium'), field: 'premium', align: 'center' as const }
])

const pricingRows = computed(() => [
  { type: t('about.pricing.team10'), standard: '$9/user', premium: '$25/user' },
  { type: t('about.pricing.team10to50'), standard: '$15/user', premium: '$25/user' },
  { type: t('about.pricing.team50'), standard: '$25/user', premium: '$25/user' }
])
</script>



