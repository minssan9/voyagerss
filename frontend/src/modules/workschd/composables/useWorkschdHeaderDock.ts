import { onMounted, ref } from 'vue'

/** Header targets exist only after WorkschdPage is mounted. */
export function useWorkschdHeaderDock() {
  const docked = ref(false)
  onMounted(() => {
    docked.value = true
  })
  return docked
}
