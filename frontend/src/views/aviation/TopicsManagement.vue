<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-h6">토픽 관리</div>
          <q-btn
            color="primary"
            icon="add"
            label="새 토픽 추가"
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
                <q-tooltip>편집</q-tooltip>
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
          <div class="text-h6">{{ editingTopic ? '토픽 편집' : '새 토픽 추가' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="topicForm.name"
            label="토픽명"
            :rules="[val => !!val || '토픽명은 필수입니다']"
          />
          <q-input
            v-model="topicForm.description"
            label="설명"
            type="textarea"
            class="q-mt-md"
          />
          <q-select
            v-model="topicForm.dayOfWeek"
            :options="dayOptions"
            label="요일"
            class="q-mt-md"
            :rules="[val => val !== null || '요일을 선택하세요']"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="primary" v-close-popup />
          <q-btn
            flat
            label="저장"
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
import { ref, onMounted } from 'vue';
import { topicsApi } from '@/api/aviation/client';
import { useQuasar, type QTableColumn } from 'quasar';
import type { Topic } from '@/types/aviation/api';

const $q = useQuasar();
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

const dayOptions = [
  { label: '일요일', value: 0 },
  { label: '월요일', value: 1 },
  { label: '화요일', value: 2 },
  { label: '수요일', value: 3 },
  { label: '목요일', value: 4 },
  { label: '금요일', value: 5 },
  { label: '토요일', value: 6 }
].map(opt => ({ label: opt.label, value: opt.value }));

const columns: QTableColumn[] = [
  {
    name: 'id',
    required: true,
    label: 'ID',
    align: 'left',
    field: 'id',
    sortable: true
  },
  {
    name: 'name',
    required: true,
    label: '토픽명',
    align: 'left',
    field: 'name',
    sortable: true
  },
  {
    name: 'description',
    label: '설명',
    align: 'left',
    field: 'description',
    sortable: false
  },
  {
    name: 'day_of_month',
    label: '요일',
    align: 'center',
    field: 'day_of_month',
    format: (val: any) => {
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      return dayNames[val] || val;
    },
    sortable: true
  },
  {
    name: 'actions',
    label: '작업',
    align: 'center',
    field: 'actions'
  }
];

async function loadTopics() {
  loading.value = true;
  try {
    topics.value = await topicsApi.getAll();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '토픽 로딩 실패: ' + error.message
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
      message: '모든 필수 필드를 입력하세요'
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
        message: '토픽이 업데이트되었습니다'
      });
    } else {
      await topicsApi.create({
        name: topicForm.value.name,
        description: topicForm.value.description,
        dayOfWeek: topicForm.value.dayOfWeek
      });
      $q.notify({
        type: 'positive',
        message: '토픽이 생성되었습니다'
      });
    }
    showCreateDialog.value = false;
    resetForm();
    await loadTopics();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '저장 실패: ' + error.message
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






