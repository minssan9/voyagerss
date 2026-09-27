<template>
  <q-footer class="bg-grey-9 text-white">
    <div class="q-pa-md">
      <div class="row justify-center items-center">
        <div class="col-auto">
          <q-btn flat dense color="white" :label="t('footer.privacyPolicy')" :to="{ name: 'PrivacyPolicy' }" class="text-caption" />
        </div>
        <div class="col-auto">
          <q-separator vertical dark class="q-mx-sm" />
        </div>
        <div class="col-auto">
          <q-btn flat dense color="white" :label="t('footer.terms')" :to="{ name: 'Terms' }" class="text-caption" />
        </div>
        <div class="col-auto">
          <q-separator vertical dark class="q-mx-sm" />
        </div>
        <div class="col-auto text-caption text-grey-5">
          © {{ new Date().getFullYear() }} {{ t('footer.copyright') }}
        </div>
      </div>
    </div>
  </q-footer>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
