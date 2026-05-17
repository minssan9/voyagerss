<template>
  <q-page class="page-bg q-pa-lg">
    <div class="text-h5 text-weight-semibold q-mb-lg" style="font-family:-apple-system,system-ui;">Todos</div>

    <div class="row q-gutter-sm q-mb-md">
      <q-input
        v-model="selectedDate"
        type="date"
        dense
        outlined
        dark
        label="Date"
        style="width:180px"
        @update:model-value="reload"
      />
      <q-select
        v-model="resolvedFilter"
        :options="resolvedOptions"
        dense
        outlined
        dark
        label="Status"
        style="width:140px"
        emit-value
        map-options
        @update:model-value="reload"
      />
    </div>

    <q-card flat class="dash-card">
      <q-card-section>
        <TodoList :todos="todoStore.todos" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTodoStore } from '@/stores/autodev/store_todo';
import TodoList from '@/components/autodev/TodoList.vue';

const todoStore = useTodoStore();
const selectedDate = ref<string>(new Date().toISOString().slice(0, 10));
const resolvedFilter = ref<boolean | null>(null);

const resolvedOptions = [
  { label: 'All',     value: null  },
  { label: 'Pending', value: false },
  { label: 'Done',    value: true  },
];

function reload() {
  todoStore.fetchTodos(selectedDate.value, resolvedFilter.value);
}

onMounted(reload);
</script>

<style scoped>
.page-bg { background: #0a0a0a; min-height: 100vh; }
.dash-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
</style>
