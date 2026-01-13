<template>
  <q-page padding>
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <!-- Page Header -->
        <div class="q-mb-lg">
          <h4 class="q-my-none">My Profile</h4>
          <p class="text-grey-7 q-mb-none">Manage your personal information</p>
        </div>

        <!-- Profile Information Card -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Profile Information</div>

            <q-form @submit="updateProfile" class="q-gutter-md">
              <q-input
                v-model="profileForm.name"
                label="Full Name"
                filled
                :rules="[val => !!val || 'Name is required']"
              >
                <template v-slot:prepend>
                  <q-icon name="person" />
                </template>
              </q-input>

              <q-input
                v-model="profileForm.phone"
                label="Phone Number"
                filled
                mask="###-####-####"
                hint="Format: 010-1234-5678"
              >
                <template v-slot:prepend>
                  <q-icon name="phone" />
                </template>
              </q-input>

              <q-input
                v-model="user.email"
                label="Email"
                filled
                readonly
                disable
                hint="Email cannot be changed"
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <q-input
                v-model="user.role"
                label="Role"
                filled
                readonly
                disable
              >
                <template v-slot:prepend>
                  <q-icon name="badge" />
                </template>
              </q-input>

              <div class="row justify-end q-gutter-sm">
                <q-btn
                  label="Cancel"
                  color="grey"
                  flat
                  @click="resetProfileForm"
                />
                <q-btn
                  type="submit"
                  label="Save Changes"
                  color="primary"
                  :loading="savingProfile"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Change Password Card -->
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Change Password</div>

            <q-form @submit="changePassword" class="q-gutter-md">
              <q-input
                v-model="passwordForm.oldPassword"
                label="Current Password"
                type="password"
                filled
                :rules="[val => !!val || 'Current password is required']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" />
                </template>
              </q-input>

              <q-input
                v-model="passwordForm.newPassword"
                label="New Password"
                type="password"
                filled
                :rules="[
                  val => !!val || 'New password is required',
                  val => val.length >= 6 || 'Password must be at least 6 characters'
                ]"
              >
                <template v-slot:prepend>
                  <q-icon name="lock_reset" />
                </template>
              </q-input>

              <q-input
                v-model="passwordForm.confirmPassword"
                label="Confirm New Password"
                type="password"
                filled
                :rules="[
                  val => !!val || 'Please confirm your password',
                  val => val === passwordForm.newPassword || 'Passwords do not match'
                ]"
              >
                <template v-slot:prepend>
                  <q-icon name="lock_reset" />
                </template>
              </q-input>

              <div class="row justify-end q-gutter-sm">
                <q-btn
                  label="Cancel"
                  color="grey"
                  flat
                  @click="resetPasswordForm"
                />
                <q-btn
                  type="submit"
                  label="Change Password"
                  color="primary"
                  :loading="changingPassword"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Account Statistics Card (Optional) -->
        <q-card class="q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Account Statistics</div>

            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-card flat bordered>
                  <q-card-section class="text-center">
                    <div class="text-h4 text-primary">{{ statistics.totalTasks }}</div>
                    <div class="text-grey-7">Total Tasks</div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-6">
                <q-card flat bordered>
                  <q-card-section class="text-center">
                    <div class="text-h4 text-green">{{ statistics.completedTasks }}</div>
                    <div class="text-grey-7">Completed</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <div class="q-mt-sm text-caption text-grey-7">
              Member since: {{ formatDate(user.createdAt) }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/common/store_user'
import apiAccount, { ProfileUpdateData } from '@/api/workschd/api-account'
import apiStatistics from '@/api/workschd/api-statistics'
import { format } from 'date-fns'

const $q = useQuasar()
const userStore = useUserStore()

const user = ref({
  accountId: 0,
  username: '',
  email: '',
  name: '',
  phone: '',
  role: '',
  createdAt: new Date()
})

const profileForm = ref<ProfileUpdateData>({
  name: '',
  phone: ''
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const statistics = ref({
  totalTasks: 0,
  completedTasks: 0
})

const savingProfile = ref(false)
const changingPassword = ref(false)

const loadProfile = async () => {
  try {
    const accountId = userStore.user.id
    if (!accountId) {
      $q.notify({
        type: 'negative',
        message: 'User not logged in',
        position: 'top'
      })
      return
    }

    const response = await apiAccount.getAccount(accountId)
    user.value = {
      ...response.data,
      createdAt: new Date(response.data.createdAt || Date.now())
    }

    // Initialize profile form
    profileForm.value = {
      name: user.value.name || '',
      phone: user.value.phone || ''
    }

    // Load user statistics if worker
    if (user.value.role === 'HELPER') {
      const statsResponse = await apiStatistics.getWorkerStatistics(accountId)
      statistics.value = {
        totalTasks: statsResponse.data.totalTasksAssigned,
        completedTasks: statsResponse.data.completedTasks
      }
    }
  } catch (error: any) {
    console.error('Failed to load profile:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load profile',
      caption: error.response?.data?.message || error.message,
      position: 'top'
    })
  }
}

const updateProfile = async () => {
  savingProfile.value = true
  try {
    const response = await apiAccount.updateProfile(profileForm.value)
    user.value = {
      ...user.value,
      ...response.data
    }

    // Update user store
    userStore.updateUser({
      name: response.data.name,
      phone: response.data.phone
    })

    $q.notify({
      type: 'positive',
      message: 'Profile updated successfully',
      position: 'top'
    })
  } catch (error: any) {
    console.error('Failed to update profile:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to update profile',
      caption: error.response?.data?.message || error.message,
      position: 'top'
    })
  } finally {
    savingProfile.value = false
  }
}

const changePassword = async () => {
  changingPassword.value = true
  try {
    await apiAccount.changePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })

    $q.notify({
      type: 'positive',
      message: 'Password changed successfully',
      position: 'top'
    })

    resetPasswordForm()
  } catch (error: any) {
    console.error('Failed to change password:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to change password',
      caption: error.response?.data?.message || error.message,
      position: 'top'
    })
  } finally {
    changingPassword.value = false
  }
}

const resetProfileForm = () => {
  profileForm.value = {
    name: user.value.name || '',
    phone: user.value.phone || ''
  }
}

const resetPasswordForm = () => {
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
}

const formatDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy')
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
/* Add any custom styles here */
</style>
