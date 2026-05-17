<template>
  <q-page class="page-bg q-pa-lg">
    <div class="text-h5 text-weight-semibold q-mb-lg" style="font-family:-apple-system,system-ui;">Settings</div>

    <q-card flat class="dash-card q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Integration Status</div>
        <div class="row q-gutter-md">
          <div class="col-12 col-sm-4" v-for="s in integrations" :key="s.name">
            <div class="row items-center q-gutter-sm">
              <q-icon
                :name="s.configured ? 'check_circle' : 'cancel'"
                :color="s.configured ? 'positive' : 'negative'"
              />
              <span>{{ s.name }}</span>
              <q-btn flat dense size="xs" label="Test" @click="testConnection(s)" />
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat class="dash-card">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Scheduler</div>
        <div class="text-grey text-caption q-mb-xs">Daily Cron Expression</div>
        <div class="text-mono text-white">{{ settings.dailyCron }}</div>
        <div class="text-caption text-grey q-mt-xs">
          Runs Monday–Friday at 09:00 KST. Edit via AUTODEV_DAILY_CRON env var.
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { getSettings, checkSettingsHealth, type Settings } from '@/api/autodev/api-autodev';

interface Integration {
  name: string;
  configured: boolean;
  endpoint: string | null;
}

const $q = useQuasar();
const settings = ref<Settings>({ jiraConfigured: false, slackConfigured: false, dailyCron: '—' });
const integrations = ref<Integration[]>([]);

onMounted(async () => {
  try {
    const { data } = await getSettings();
    settings.value = data;
    integrations.value = [
      { name: 'Jira',  configured: data.jiraConfigured,  endpoint: 'jira'  },
      { name: 'Slack', configured: data.slackConfigured, endpoint: null    },
    ];
  } catch {
    // not authenticated yet
  }
});

async function testConnection(s: Integration) {
  if (!s.endpoint) {
    $q.notify({ type: 'info', message: `${s.name}: no test endpoint` });
    return;
  }
  try {
    const { data } = await checkSettingsHealth(s.endpoint);
    $q.notify({
      type: data.connected ? 'positive' : 'negative',
      message: `${s.name}: ${data.connected ? 'Connected' : 'Not connected'}`,
    });
  } catch {
    $q.notify({ type: 'negative', message: `${s.name}: request failed` });
  }
}
</script>

<style scoped>
.page-bg { background: #0a0a0a; min-height: 100vh; }
.dash-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
.text-mono { font-family: 'SF Mono', Menlo, monospace; }
</style>
