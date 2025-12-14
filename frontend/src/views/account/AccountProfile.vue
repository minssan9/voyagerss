<template>
  <q-page padding class="q-px-sm q-px-md-lg">
    <div class="row q-col-gutter-md justify-center">
      <!-- Profile Settings Card -->
      <div class="col-12 col-sm-10 col-md-8">
        <q-card class="q-mb-md">
          <q-card-section class="bg-primary text-white q-py-sm">
            <div class="text-subtitle1">{{ t('profile.title', '프로필 설정') }}</div>
          </q-card-section>

          <q-card-section class="q-pa-sm-md">
            <q-form @submit.prevent="handleProfileUpdate" class="q-gutter-y-md">
              <!-- Profile Image -->
              <div class="row justify-center q-mb-md">
                <q-avatar size="100px" class="q-mb-sm">
                  <q-img
                    :src="userStore.user.profileImageUrl || 'https://cdn.quasar.dev/img/boy-avatar.png'"
                    class="cursor-pointer"
                    @click="$refs.fileInput.click()"
                  >
                    <div class="absolute-bottom text-caption text-center bg-black q-pa-xs" style="opacity: 0.7">
                      {{ t('profile.image.change', '이미지 변경') }}
                    </div>
                  </q-img>
                </q-avatar>
                <input
                  type="file"
                  ref="fileInput"
                  accept="image/*"
                  style="display: none"
                  @change="handleImageUpload"
                />
              </div>

              <!-- Profile Form -->
              <div class="row q-col-gutter-sm">
                <div class="col-12">
                  <q-input
                    v-model="profileForm.username"
                    :label="t('profile.label.username', '사용자 이름')"
                    dense
                    outlined
                    :rules="[val => !!val || t('profile.validation.usernameRequired', '사용자 이름을 입력해주세요')]"
                  >
                    <template v-slot:prepend>
                      <q-icon size="sm" name="person" />
                    </template>
                  </q-input>
                </div>

                <div class="col-12">
                  <q-input
                    v-model="profileForm.email"
                    :label="t('profile.label.email', '이메일')"
                    dense
                    outlined
                    type="email"
                    :rules="[
                      val => !!val || t('profile.validation.emailRequired', '이메일을 입력해주세요'),
                      val => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(val) || t('profile.validation.emailInvalid', '올바른 이메일 형식이 아닙니다')
                    ]"
                    :readonly="!userStore.isManager"
                  >
                    <template v-slot:prepend>
                      <q-icon size="sm" name="email" />
                    </template>
                  </q-input>
                </div>

                <div class="col-12">
                  <q-input
                    v-model="profileForm.phone"
                    :label="t('profile.label.phone', '전화번호')"
                    dense
                    outlined
                    type="tel"
                    mask="###-####-####"
                    :rules="[val => !val || /^\d{3}-\d{4}-\d{4}$/.test(val) || t('profile.validation.phoneInvalid', '올바른 전화번호 형식이 아닙니다')]"
                  >
                    <template v-slot:prepend>
                      <q-icon size="sm" name="phone" />
                    </template>
                  </q-input>
                </div>

                <div class="col-12">
                  <q-input
                    v-model="userStore.user.role"
                    :label="t('profile.label.role', '역할')"
                    dense
                    outlined
                    readonly
                  >
                    <template v-slot:prepend>
                      <q-icon size="sm" name="badge" />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="row justify-end q-mt-sm">
                <q-btn
                  :label="t('profile.button.update', '프로필 업데이트')"
                  type="submit"
                  color="primary"
                  :loading="isUpdating"
                  size="sm"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Notification Settings Card -->
        <q-card>
          <q-card-section class="bg-primary text-white q-py-sm">
            <div class="text-subtitle1">{{ t('profile.notifications.title', '알림 설정') }}</div>
          </q-card-section>

          <q-card-section class="q-pa-sm-md">
            <div class="q-gutter-y-sm">
              <q-item dense tag="label" v-ripple>
                <q-item-section>
                  <q-item-label class="text-subtitle2">{{ t('profile.notifications.email', '이메일 알림') }}</q-item-label>
                  <q-item-label caption>
                    {{ t('profile.notifications.emailDesc', '스케줄 변경 및 중요 알림을 이메일로 받습니다') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle dense v-model="notificationSettings.email" color="primary" />
                </q-item-section>
              </q-item>

              <q-item tag="label" v-ripple>
                <q-item-section>
                  <q-item-label>{{ t('profile.notifications.push', '푸시 알림') }}</q-item-label>
                  <q-item-label caption>
                    {{ t('profile.notifications.pushDesc', '실시간 알림을 브라우저로 받습니다') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="notificationSettings.push" color="primary" />
                </q-item-section>
              </q-item>

              <q-item tag="label" v-ripple>
                <q-item-section>
                  <q-item-label>{{ t('profile.notifications.accountWorkHour', '스케줄 알림') }}</q-item-label>
                  <q-item-label caption>
                    {{ t('profile.notifications.scheduleDesc', '근무 시작 전 알림을 받습니다') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="notificationSettings.accountWorkHour" color="primary" />
                </q-item-section>
              </q-item>
            </div>

            <div class="row justify-end q-mt-sm">
              <q-btn
                :label="t('profile.notifications.saveButton', '알림 설정 저장')"
                color="primary"
                :loading="isSavingNotifications"
                @click="handleNotificationUpdate"
                size="sm"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/modules/store_user'
import apiAccount from '@/api/modules/api-account'

const { t } = useI18n()
const $q = useQuasar()
const userStore = useUserStore()

interface ProfileForm {
  username: string
  email: string
  phone: string
}

const profileForm = ref<ProfileForm>({
  username: '',
  email: '',
  phone: ''
})

const isUpdating = ref(false)

// Add new interface for notification settings
interface NotificationSettings {
  email: boolean
  push: boolean
  accountWorkHour: boolean
}

// Add new ref for notification settings
const notificationSettings = ref<NotificationSettings>({
  email: false,
  push: false,
  accountWorkHour: false
})

const isSavingNotifications = ref(false)

// Initialize form with user data
onMounted(async () => {
  profileForm.value = {
    username: userStore.user.username || '',
    email: userStore.user.email || '',
    phone: userStore.user.phone || ''
  }

  // Initialize notification settings
  try {
    const response = await apiAccount.getNotificationSettings()
    notificationSettings.value = response.data
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('profile.notifications.loadError', '알림 설정을 불러오는데 실패했습니다')
    })
  }
})

const handleImageUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    try {
      isUpdating.value = true
      const formData = new FormData()
      formData.append('file', file)
      
      // Assuming you have an API endpoint for image upload
      const response = await apiAccount.uploadProfileImage(formData)
      
      if (response.data?.imageUrl) {
        await userStore.updateProfileImage(response.data.imageUrl)
        $q.notify({
          type: 'positive',
          message: t('profile.notification.imageUpdateSuccess', '프로필 이미지가 업데이트되었습니다')
        })
      }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: t('profile.notification.imageUpdateError', '이미지 업로드 중 오류가 발생했습니다')
      })
    } finally {
      isUpdating.value = false
    }
  }
}

const handleProfileUpdate = async () => {
  try {
    isUpdating.value = true
    
    // Update profile through API
    const response = await apiAccount.updateProfile({
      username: profileForm.value.username,
      email: profileForm.value.email,
      phone: profileForm.value.phone
    })

    // Update store with new user data
    await userStore.updateProfile(response.data)

    $q.notify({
      type: 'positive',
      message: t('profile.notification.updateSuccess', '프로필이 성공적으로 업데이트되었습니다')
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('profile.notification.updateError', '프로필 업데이트 중 오류가 발생했습니다')
    })
  } finally {
    isUpdating.value = false
  }
}

// Add new method for updating notification settings
const handleNotificationUpdate = async () => {
  try {
    isSavingNotifications.value = true
    await apiAccount.updateNotificationSettings(notificationSettings.value)
    
    $q.notify({
      type: 'positive',
      message: t('profile.notifications.updateSuccess', '알림 설정이 저장되었습니다')
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('profile.notifications.updateError', '알림 설정 저장에 실패했습니다')
    })
  } finally {
    isSavingNotifications.value = false
  }
}
</script>

<style lang="scss" scoped>
.q-avatar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  .q-img {
    transition: opacity 0.3s ease;
    
    &:hover {
      opacity: 0.8;
    }
  }
}

// Add responsive padding
@media (max-width: 599px) {
  .q-card-section {
    padding: 8px !important;
  }
  
  .q-gutter-y-md > * {
    margin-top: 8px !important;
    margin-bottom: 8px !important;
  }
}
</style> 