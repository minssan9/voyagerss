<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-h6">{{ t('aviation.topics.title') }}</div>
          <q-btn
            color="primary"
            icon="add"
            :label="t('aviation.topics.addTopic')"
            @click="showCreateDialog = true"
          />
        </div>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="topics"
          :columns="columns"
          row-key="id"
          :loading="loading"
          :rows-per-page-options="[10, 20, 50]"
        >
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                round
                icon="edit"
                @click="editTopic(props.row)"
                color="primary"
              >
                <q-tooltip>{{ t('aviation.common.edit') }}</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingTopic ? t('aviation.topics.editTopic') : t('aviation.topics.addTopic') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="topicForm.name"
            :label="t('aviation.topics.name')"
            :rules="[val => !!val || t('aviation.topics.validation.nameRequired')]"
          />
          <q-input
            v-model="topicForm.description"
            :label="t('aviation.common.description')"
            type="textarea"
            class="q-mt-md"
          />
          <q-select
            v-model="topicForm.dayOfWeek"
            :options="dayOptions"
            :label="t('aviation.common.dayOfWeek')"
            class="q-mt-md"
            :rules="[val => val !== null || t('aviation.topics.validation.dayRequired')]"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('aviation.common.cancel')" color="primary" v-close-popup />
          <q-btn
            flat
            :label="t('aviation.common.save')"
            color="primary"
            @click="saveTopic"
            :loading="saving"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { topicsApi } from '@/modules/aviation/api/client';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { Topic } from '@/types/aviation/api';

const $q = useQuasar();
const { t, tm } = useI18n();
const topics = ref<Topic[]>([]);
const loading = ref(false);
const saving = ref(false);
const showCreateDialog = ref(false);
const editingTopic = ref<Topic | null>(null);

const topicForm = ref({
  name: '',
  description: '',
  dayOfWeek: null as number | null
});

const dayNamesShort = computed(() => tm('aviation.common.daysShort') as string[]);

const dayOptions = computed(() =>
  [0, 1, 2, 3, 4, 5, 6].map((value) => ({
    label: t(`aviation.common.days.${value}`),
    value,
  }))
);

const columns = computed<QTableColumn[]>(() => [
  {
    name: 'id',
    required: true,
    label: t('aviation.common.id'),
    align: 'left',
    field: 'id',
    sortable: true
  },
  {
    name: 'name',
    required: true,
    label: t('aviation.topics.columns.name'),
    align: 'left',
    field: 'name',
    sortable: true
  },
  {
    name: 'description',
    label: t('aviation.common.description'),
    align: 'left',
    field: 'description',
    sortable: false
  },
  {
    name: 'day_of_month',
    label: t('aviation.common.dayOfWeek'),
    align: 'center',
    field: 'day_of_month',
    format: (val: any) => dayNamesShort.value[val] || val,
    sortable: true
  },
  {
    name: 'actions',
    label: t('aviation.common.actions'),
    align: 'center',
    field: 'actions'
  }
]);

async function loadTopics() {
  loading.value = true;
  try {
    topics.value = await topicsApi.getAll();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: t('aviation.topics.notify.loadFailed', { message: error.message })
    });
  } finally {
    loading.value = false;
  }
}

function editTopic(topic: Topic) {
  editingTopic.value = topic;
  topicForm.value = {
    name: topic.name,
    description: topic.description || '',
    dayOfWeek: topic.day_of_month
  };
  showCreateDialog.value = true;
}

async function saveTopic() {
  if (!topicForm.value.name || topicForm.value.dayOfWeek === null) {
    $q.notify({
      type: 'negative',
      message: t('aviation.topics.notify.requiredFields')
    });
    return;
  }

  saving.value = true;
  try {
    if (editingTopic.value) {
      await topicsApi.update(editingTopic.value.id, {
        name: topicForm.value.name,
        description: topicForm.value.description,
        dayOfWeek: topicForm.value.dayOfWeek
      });
      $q.notify({
        type: 'positive',
        message: t('aviation.topics.notify.updated')
      });
    } else {
      await topicsApi.create({
        name: topicForm.value.name,
        description: topicForm.value.description,
        dayOfWeek: topicForm.value.dayOfWeek
      });
      $q.notify({
        type: 'positive',
        message: t('aviation.topics.notify.created')
      });
    }
    showCreateDialog.value = false;
    resetForm();
    await loadTopics();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: t('aviation.topics.notify.saveFailed', { message: error.message })
    });
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  editingTopic.value = null;
  topicForm.value = {
    name: '',
    description: '',
    dayOfWeek: null
  };
}

onMounted(() => {
  loadTopics();
});
</script>

<style scoped lang="sass">
</style>
