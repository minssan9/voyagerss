<template>
  <q-list separator>
    <q-item v-for="todo in todos" :key="todo.id">
      <q-item-section avatar>
        <q-icon
          :name="todo.resolved ? 'check_circle' : 'radio_button_unchecked'"
          :color="todo.resolved ? 'positive' : 'grey'"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label :class="{ 'text-strike text-grey': todo.resolved }">
          {{ todo.content?.split('\n')[0] || '—' }}
        </q-item-label>
        <q-item-label caption>{{ todo.date }}</q-item-label>
      </q-item-section>
    </q-item>
    <q-item v-if="!todos.length">
      <q-item-section class="text-grey text-center">No todos</q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import type { Todo } from '@/api/autodev/api-autodev';

withDefaults(defineProps<{ todos: Todo[] }>(), { todos: () => [] });
</script>
