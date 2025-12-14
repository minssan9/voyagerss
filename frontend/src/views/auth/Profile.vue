<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import apiUser from '@/api/modules/api-user'

const $q = useQuasar()
const userProfile = ref(null)

const fetchUserProfile = async () => {
  try {
    const { data } = await apiUser.getCurrentUser()
    userProfile.value = data
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load profile'
    })
  }
}

onMounted(fetchUserProfile)
</script> 