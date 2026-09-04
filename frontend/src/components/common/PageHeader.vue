<template>
  <div class="page-header">
    <!-- Breadcrumb -->
    <nav v-if="breadcrumb?.length" class="page-header__breadcrumb" aria-label="breadcrumb">
      <span v-for="(crumb, idx) in breadcrumb" :key="idx" class="breadcrumb-item">
        <router-link v-if="crumb.to && idx < breadcrumb.length - 1" :to="crumb.to" class="breadcrumb-link">
          {{ crumb.label }}
        </router-link>
        <span v-else class="breadcrumb-current">{{ crumb.label }}</span>
        <q-icon v-if="idx < breadcrumb.length - 1" name="chevron_right" size="14px" class="breadcrumb-sep" />
      </span>
    </nav>

    <!-- Title row -->
    <div class="page-header__title-row">
      <div class="page-header__title-group">
        <div v-if="icon" class="page-header__icon">
          <q-icon :name="icon" size="22px" />
        </div>
        <div>
          <h1 class="page-header__title">{{ title }}</h1>
          <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Breadcrumb {
  label: string
  to?: string | Record<string, unknown>
}

defineProps<{
  title: string
  subtitle?: string
  icon?: string
  breadcrumb?: Breadcrumb[]
}>()
</script>

<style scoped lang="scss">
.page-header {
  margin-bottom: 24px;

  &__breadcrumb {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .breadcrumb-item {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .breadcrumb-link {
    font-size: 12px;
    color: var(--voy-text-secondary, #6e6e73);
    text-decoration: none;
    transition: color 150ms;

    &:hover { color: var(--voy-primary, #0037EB); }
  }

  .breadcrumb-current {
    font-size: 12px;
    color: var(--voy-text-muted, #9ca3af);
  }

  .breadcrumb-sep {
    color: var(--voy-text-muted, #9ca3af);
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: var(--voy-radius-md, 12px);
    background: var(--voy-primary-muted, rgba(0,55,235,0.08));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--voy-primary, #0037EB);
    flex-shrink: 0;
  }

  &__title {
    font-size: 22px;
    font-weight: 700;
    color: var(--voy-text, #1d1d1f);
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 0;
  }

  &__subtitle {
    font-size: 14px;
    color: var(--voy-text-secondary, #6e6e73);
    margin: 4px 0 0;
    line-height: 1.4;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}
</style>
