import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useAppConfigStore = defineStore('appConfig', () => {
  const _config = ref<Record<string, string>>({})
  const loaded = ref(false)

  async function load() {
    try {
      const base = import.meta.env.VITE_API_BASE_URL
      const res = await axios.get<{ data: Record<string, string> }>(`${base}/workschd/config/public`)
      _config.value = res.data.data ?? {}
    } catch (e) {
      console.warn('[AppConfig] Failed to load remote config, using fallbacks:', e)
    } finally {
      loaded.value = true
    }
  }

  function get(key: string, fallback = ''): string {
    return _config.value[key] ?? fallback
  }

  return { loaded, load, get }
})
