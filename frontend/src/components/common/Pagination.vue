<template>
  <div class="pagination-container">
    <q-pagination
      v-model="currentPage"
      :max="totalPages"
      :max-pages="6"
      :boundary-links="true"
      :direction-links="true"
      @update:model-value="onPageChange"
    />
    
    <q-select
      v-model="pageSize"
      :options="pageSizeOptions"
      label="Items per page"
      dense
      options-dense
      class="page-size-select"
      @update:model-value="onPageSizeChange"
    />
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';

const props = defineProps({
  totalItems: {
    type: Number,
    required: true
  },
  initialPage: {
    type: Number,
    default: 1
  },
  initialPageSize: {
    type: Number,
    default: 10
  },
  pageSizeOptions: {
    type: Array,
    default: () => [5, 10, 20, 50, 100]
  }
});

const emit = defineEmits(['page-change']);

const currentPage = ref(props.initialPage);
const pageSize = ref(props.initialPageSize);
const totalPages = ref(Math.ceil(props.totalItems / pageSize.value));

// Watch for changes in total items to recalculate total pages
watch(() => props.totalItems, (newValue) => {
  totalPages.value = Math.ceil(newValue / pageSize.value);
  
  // If current page is greater than total pages, reset to last page
  if (currentPage.value > totalPages.value && totalPages.value > 0) {
    currentPage.value = totalPages.value;
    onPageChange(currentPage.value);
  }
});

// Watch for changes in page size to recalculate total pages
watch(pageSize, (newValue) => {
  totalPages.value = Math.ceil(props.totalItems / newValue);
  
  // If current page is greater than total pages, reset to last page
  if (currentPage.value > totalPages.value && totalPages.value > 0) {
    currentPage.value = totalPages.value;
  }
});

function onPageChange(page: number) {
  emit('page-change', {
    page: page - 1, // Convert to 0-based for API
    size: pageSize.value
  });
}

function onPageSizeChange(size: number) {
  // Reset to first page when changing page size
  currentPage.value = 1;
  emit('page-change', {
    page: 0, // 0-based for API
    size: size
  });
}

onMounted(() => {
  // Initial emit to load first page
  emit('page-change', {
    page: currentPage.value - 1, // Convert to 0-based for API
    size: pageSize.value
  });
});
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.5rem 0;
}

.page-size-select {
  width: 150px;
}
</style> 