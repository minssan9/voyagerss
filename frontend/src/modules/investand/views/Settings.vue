<template>
  <div class="settings-page animate-fadeIn">
    <div class="page-card">
      <div class="page-header">
        <q-icon name="settings" class="header-icon" />
        <div>
          <h2>System Settings</h2>
          <p>Configure your FinDash preferences</p>
        </div>
      </div>

      <div class="settings-grid">
        <!-- API Configuration -->
        <div class="settings-section">
          <h3>API Configuration</h3>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Gemini API Key</span>
              <span class="setting-desc">Used for AI-powered portfolio insights</span>
            </div>
            <q-input
              v-model="geminiApiKey"
              type="password"
              outlined
              dense
              placeholder="Enter API key"
              class="setting-input"
            />
          </div>
        </div>

        <!-- Data Sync -->
        <div class="settings-section">
          <h3>Data Synchronization</h3>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Auto-sync Interval</span>
              <span class="setting-desc">How often to refresh market data</span>
            </div>
            <q-select
              v-model="syncInterval"
              :options="['1 minute', '5 minutes', '15 minutes', '30 minutes', 'Manual only']"
              outlined
              dense
              class="setting-input"
            />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Clear Local Database</span>
              <span class="setting-desc">Reset all cached data</span>
            </div>
            <q-btn 
              outline 
              color="negative" 
              label="Clear Data" 
              @click="clearLocalData"
            />
          </div>
        </div>

        <!-- Display -->
        <div class="settings-section">
          <h3>Display Preferences</h3>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Currency</span>
              <span class="setting-desc">Default currency for display</span>
            </div>
            <q-select
              v-model="currency"
              :options="['USD ($)', 'EUR (€)', 'GBP (£)', 'KRW (₩)']"
              outlined
              dense
              class="setting-input"
            />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Theme</span>
              <span class="setting-desc">Application color scheme</span>
            </div>
            <q-btn-toggle
              v-model="theme"
              :options="[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' }
              ]"
              unelevated
              toggle-color="primary"
            />
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <q-btn unelevated color="primary" label="Save Settings" @click="saveSettings" />
        <q-btn flat label="Reset to Defaults" @click="resetSettings" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const geminiApiKey = ref('');
const syncInterval = ref('5 minutes');
const currency = ref('USD ($)');
const theme = ref('light');

function clearLocalData() {
  $q.dialog({
    title: 'Confirm',
    message: 'This will clear all cached data. Are you sure?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    localStorage.removeItem('findash_mongo_v2');
    $q.notify({ type: 'positive', message: 'Local data cleared successfully' });
  });
}

function saveSettings() {
  // Save settings to localStorage
  const settings = {
    syncInterval: syncInterval.value,
    currency: currency.value,
    theme: theme.value
  };
  localStorage.setItem('findash_settings', JSON.stringify(settings));
  $q.notify({ type: 'positive', message: 'Settings saved successfully' });
}

function resetSettings() {
  syncInterval.value = '5 minutes';
  currency.value = 'USD ($)';
  theme.value = 'light';
  geminiApiKey.value = '';
  $q.notify({ type: 'info', message: 'Settings reset to defaults' });
}
</script>

<style lang="scss" scoped>
@import '@/assets/sass/investand/findash/variables';

.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-card {
  @include findash-card;
  padding: 1.5rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;

  .header-icon {
    font-size: 1.5rem;
    color: $findash-indigo;
    padding: 0.75rem;
    background: rgba($findash-indigo, 0.1);
    border-radius: 0.75rem;
  }

  h2 {
    font-size: 1.125rem;
    font-weight: 700;
    color: $findash-slate-800;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    color: $findash-slate-500;
    margin: 0.25rem 0 0;
  }
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: $findash-slate-700;
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid $findash-slate-200;
  }
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 0;
  border-bottom: 1px solid $findash-slate-100;

  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-label {
  font-weight: 500;
  color: $findash-slate-700;
  font-size: 0.875rem;
}

.setting-desc {
  font-size: 0.75rem;
  color: $findash-slate-400;
}

.setting-input {
  min-width: 200px;
}

.settings-footer {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid $findash-slate-200;
}
</style>


