import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getTodos, type Todo } from '@/api/autodev/api-autodev';

export const useTodoStore = defineStore('autodev-todo', () => {
  const todos = ref<Todo[]>([]);
  const loading = ref(false);

  async function fetchTodos(date?: string, resolved?: boolean | null): Promise<void> {
    loading.value = true;
    try {
      const params: { date?: string; resolved?: boolean } = {};
      if (date) params.date = date;
      if (resolved !== undefined && resolved !== null) params.resolved = resolved;
      const { data } = await getTodos(params);
      todos.value = data;
    } finally {
      loading.value = false;
    }
  }

  return { todos, loading, fetchTodos };
});
