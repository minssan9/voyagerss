<template>
  <q-page padding class="modern-page page-container">
    <div class="modern-bg__pattern absolute-full"></div>

    <!-- Header Section -->
    <div class="modern-page__header fade-in">
      <div class="row justify-center items-center q-py-xl">
        <div class="col-12 col-md-8 text-center">
          <h1 class="modern-text__title q-mb-md text-h3">{{ t('home.header.title', '근무 스케줄표 자동 생성 서비스') }}</h1>
          <p class="modern-text__subtitle q-mb-xl text-h6">{{ t('home.header.subtitle', '효율적인 근무 관리를 위한 스케줄 자동화 솔루션') }}</p>
          <div class="row q-col-gutter-md justify-center">
            <div class="col-auto">
              <q-btn
                class="modern-button"
                :label="t('home.header.button.start', '지금 시작하기')"
                :href="webUrl"
                no-caps
              />
            </div>
            <div class="col-auto">
              <q-btn
                class="modern-button modern-button--secondary"
                :label="t('home.header.button.learnMore', '더 알아보기')"
                :href="webUrl"
                no-caps
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Sections -->
    <div class="modern-page__content q-pt-xl">
      <div class="row q-col-gutter-xl">
        <!-- Service Overview -->
        <div class="col-12 col-md-4">
          <div class="modern-card slide-up stagger-1" style="height: 100%;">
            <div class="modern-card__header">
              <h2 class="modern-text__title text-h5 q-mb-md">{{ t('home.overview.title', '서비스 개요') }}</h2>
            </div>
            <div class="modern-card__body">
              <q-list separator>
                <q-item v-for="i in 3" :key="`feature${i}`" class="q-py-md">
                  <q-item-section avatar>
                    <q-avatar :style="`background: ${['#4361ee', '#3a0ca3', '#4cc9f0'][i-1]}`" text-color="white" icon="check" />
                  </q-item-section>
                  <q-item-section>
                    <div class="text-weight-medium">{{ t(`home.overview.feature${i}.title`, ['직관적인 인터페이스', '실시간 동기화', '맞춤형 옵션'][i-1]) }}</div>
                    <div class="text-caption">
                      {{ t(`home.overview.feature${i}.description`, [
                        '사용자 친화적인 디자인으로 누구나 쉽게 사용할 수 있습니다.',
                        '모든 팀원의 스케줄이 실시간으로 공유되어 효율적인 협업이 가능합니다.',
                        '개인과 팀의 니즈에 맞춰 다양한 설정 옵션을 제공합니다.'
                      ][i-1]) }}
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>

        <!-- Features -->
        <div class="col-12 col-md-4">
          <div class="modern-card slide-up stagger-2" style="height: 100%;">
            <div class="modern-card__header" style="background: linear-gradient(145deg, #4361ee, #3a0ca3); color: white;">
              <h2 class="modern-text__title text-h5 q-mb-md">{{ t('home.features.title', '주요 기능') }}</h2>
            </div>
            <div class="modern-card__body">
              <q-list>
                <q-item v-for="i in 3" :key="`description${i}`" class="q-py-md">
                  <q-item-section avatar>
                    <q-avatar color="accent" text-color="white" :icon="['schedule', 'notifications', 'description'][i-1]" />
                  </q-item-section>
                  <q-item-section>
                    <div class="text-weight-medium">{{ t(`home.features.title${i}`, ['스케줄 자동화', '실시간 알림', '보고서 생성'][i-1]) }}</div>
                    <div class="text-caption">
                      {{ t(`home.features.description${i}`, [
                        '직원 근무 패턴을 학습하여 최적의 스케줄을 자동으로 생성합니다.',
                        '근무 시간 변경, 승인 요청 등의 알림을 실시간으로 전송합니다.',
                        '근태 관리, 시간 외 근무 등의 보고서를 손쉽게 생성할 수 있습니다.'
                      ][i-1]) }}
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>

        <!-- Usage Guide -->
        <div class="col-12 col-md-4">
          <div class="modern-card slide-up stagger-3" style="height: 100%;">
            <div class="modern-card__header" style="background: linear-gradient(145deg, #4cc9f0, #4361ee); color: white;">
              <h2 class="modern-text__title text-h5 q-mb-md">{{ t('home.usage.title', '사용 방법') }}</h2>
            </div>
            <div class="modern-card__body">
              <q-list>
                <q-item v-for="i in 3" :key="`step${i}`" class="q-py-md">
                  <q-item-section avatar>
                    <q-avatar class="bg-primary" text-color="white">{{ i }}</q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <div class="text-weight-medium">{{ t(`home.usage.step${i}.title`, ['계정 로그인', '스케줄 설정', '실시간 확인'][i-1]) }}</div>
                    <div class="text-caption">
                      {{ t(`home.usage.step${i}`, [
                        '웹사이트나 모바일 앱에 로그인하세요.',
                        '개인 및 팀 근무 패턴을 입력하여 스케줄을 설정할 수 있습니다.',
                        '언제 어디서든 실시간으로 근무 스케줄을 확인할 수 있습니다.'
                      ][i-1]) }}
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Call to Action -->
      <div class="row justify-center q-mt-xl q-py-xl">
        <div class="col-12 col-md-8 text-center">
          <div class="modern-bg__glass q-pa-xl" style="border-radius: 24px;">
            <h2 class="modern-text__title q-mb-md">지금 시작해보세요</h2>
            <p class="q-mb-xl">무료 체험 기간을 통해 서비스의 모든 기능을 경험해보세요.</p>
            <q-btn class="modern-button" color="primary" :label="t('home.cta.button', '무료로 시작하기')" :href="webUrl" no-caps size="lg" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="modern-page__footer">
      <div class="row justify-center">
        <div class="col-12 col-md-10">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <h5 class="text-weight-bold">About Us</h5>
              <p class="text-caption">효율적인 근무 관리를 위한 최적의 솔루션을 제공합니다.</p>
            </div>
            <div class="col-12 col-md-4">
              <h5 class="text-weight-bold">Links</h5>
              <div class="row">
                <div class="col-6">
                  <q-list dense padding>
                    <q-item clickable :href="webUrl">
                      <q-item-section>Home</q-item-section>
                    </q-item>
                    <q-item clickable :href="webUrl">
                      <q-item-section>Features</q-item-section>
                    </q-item>
                    <q-item clickable :href="webUrl">
                      <q-item-section>Pricing</q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div class="col-6">
                  <q-list dense padding>
                    <q-item clickable :href="privacyUrl">
                      <q-item-section>Privacy</q-item-section>
                    </q-item>
                    <q-item clickable :href="termsUrl">
                      <q-item-section>Terms</q-item-section>
                    </q-item>
                    <q-item clickable :href="webUrl">
                      <q-item-section>Contact</q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <h5 class="text-weight-bold">Contact</h5>
              <p class="text-caption">
                <q-icon name="email" size="xs" /> info@workschedule.com<br>
                <q-icon name="phone" size="xs" /> +82 02-123-4567<br>
                <q-icon name="place" size="xs" /> 서울특별시 강남구 테헤란로
              </p>
            </div>
          </div>
          <div class="row q-mt-md">
            <div class="col-12 text-center">
              <q-separator dark class="q-my-md" />
              <p class="text-caption q-mb-none">{{ t('home.footer.copyright', '© 2024 Work Schedule Automation Service. All rights reserved.') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'

const { t } = useI18n()

// Mock values for URLs to avoid import.meta TypeScript issues
// In production, these would be pulled from environment variables
const baseUrl = ref('https://workschedule.com');
const webUrl = computed(() => baseUrl.value);
const privacyUrl = computed(() => `${baseUrl.value}/company/privacy-policy`);
const termsUrl = computed(() => `${baseUrl.value}/company/use-term`);
</script>

<style lang="scss">
// Local styles for Home
.q-page {
  position: relative;
}

.q-item__section--avatar {
  .q-avatar {
    font-size: 1rem;
  }
}

// Custom transitions
.fade-in-up {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.8s ease forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
