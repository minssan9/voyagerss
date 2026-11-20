<template>
  <footer class="cl-footer">
    <div class="cl-footer__inner">
      <div class="cl-footer__brand">
        <strong>{{ company.name }}</strong>
        <span class="cl-footer__tagline">AI Architecture Consulting &amp; Advisory</span>
      </div>

      <!-- 사업자 정보: 언어와 관계없이 영문 고정 (DB system_config 관리) -->
      <dl v-if="infoRows.length" class="cl-footer__info" lang="en">
        <div v-for="row in infoRows" :key="row.label" class="cl-footer__info-row">
          <dt>{{ row.label }}</dt>
          <dd>
            <a v-if="row.href" :href="row.href">{{ row.value }}</a>
            <template v-else>{{ row.value }}</template>
          </dd>
        </div>
      </dl>

      <nav class="cl-footer__links" lang="en">
        <router-link to="/consulting/documents">Documents</router-link>
        <router-link to="/platform">Platform</router-link>
        <router-link to="/privacy-policy">Privacy Policy</router-link>
        <router-link to="/terms">Terms of Service</router-link>
      </nav>
      <p class="cl-footer__copy" lang="en">© {{ year }} {{ company.name.replace(/\.$/, '') }}. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
/**
 * AI 컨설팅 사이트 공통 푸터 — 사업자 정보는 영문으로 표기
 * 값은 DB(workschd.system_config, category='frontend')에서 관리하며 빈 항목은 숨김
 *   COMPANY_NAME_EN, COMPANY_CEO_EN, COMPANY_BUSINESS_REG_NO, COMPANY_ADDRESS_EN, COMPANY_PHONE, CONSULTING_CONTACT_EMAIL
 */
import { computed } from 'vue'
import { useAppConfigStore } from '@/stores/common/store_app_config'

const appConfig = useAppConfigStore()
const year = new Date().getFullYear()
const get = (key: string) => appConfig.get(key).trim()

const company = computed(() => ({
  name: get('COMPANY_NAME_EN') || 'VoyagerSS',
  ceo: get('COMPANY_CEO_EN'),
  regNo: get('COMPANY_BUSINESS_REG_NO'),
  address: get('COMPANY_ADDRESS_EN'),
  phone: get('COMPANY_PHONE'),
  email: get('CONSULTING_CONTACT_EMAIL')
}))

const infoRows = computed(() =>
  [
    { label: 'CEO', value: company.value.ceo },
    { label: 'Business Registration No.', value: company.value.regNo },
    { label: 'Address', value: company.value.address },
    { label: 'Tel', value: company.value.phone, href: company.value.phone ? `tel:${company.value.phone.replace(/[^\d+]/g, '')}` : '' },
    { label: 'Email', value: company.value.email, href: company.value.email ? `mailto:${company.value.email}` : '' }
  ].filter((row) => row.value)
)
</script>
