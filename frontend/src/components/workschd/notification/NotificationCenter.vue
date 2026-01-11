<template>
  <q-btn-dropdown
    flat
    dense
    icon="notifications"
    :label="unreadCount > 0 ? unreadCount.toString() : ''"
    :color="unreadCount > 0 ? 'red' : 'grey'"
    content-class="notification-dropdown"
  >
    <template v-slot:label>
      <q-badge
        v-if="unreadCount > 0"
        color="red"
        floating
        :label="unreadCount > 99 ? '99+' : unreadCount"
      />
    </template>

    <q-card style="min-width: 350px; max-width: 450px; max-height: 500px">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Notifications</div>
        <q-space />
        <q-btn
          v-if="unreadCount > 0"
          flat
          dense
          size="sm"
          label="Mark all as read"
          color="primary"
          @click="markAllAsRead"
        />
      </q-card-section>

      <q-separator />

      <!-- Notification List -->
      <q-scroll-area style="max-height: 400px">
        <q-list separator>
          <q-item
            v-if="notifications.length === 0"
            class="text-center text-grey"
          >
            <q-item-section>No notifications</q-item-section>
          </q-item>

          <notification-item
            v-for="notification in notifications"
            :key="notification.id"
            :notification="notification"
            @read="handleMarkAsRead"
            @delete="handleDelete"
            @click="handleNotificationClick"
          />
        </q-list>
      </q-scroll-area>

      <!-- Footer -->
      <q-separator />
      <q-card-actions align="center">
        <q-btn
          flat
          dense
          label="View All"
          color="primary"
          @click="viewAllNotifications"
        />
      </q-card-actions>
    </q-card>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import notificationApi, { Notification } from '@/api/workschd/api-notification'
import NotificationItem from './NotificationItem.vue'

const router = useRouter()
const $q = useQuasar()

const notifications = ref<Notification[]>([])
const unreadCount = ref(0)
let pollingInterval: NodeJS.Timeout | null = null

// 알림 목록 조회
const fetchNotifications = async () => {
  try {
    const response = await notificationApi.getNotifications({
      page: 0,
      size: 10,
      isRead: false
    })
    notifications.value = response.data.content || []

    // 읽지 않은 알림 개수 업데이트
    const countResponse = await notificationApi.getUnreadCount()
    unreadCount.value = countResponse.data.count
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
  }
}

// 읽음 처리
const handleMarkAsRead = async (notificationId: number) => {
  try {
    await notificationApi.markAsRead(notificationId)
    await fetchNotifications()
    $q.notify({
      type: 'positive',
      message: 'Notification marked as read',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to mark as read:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to mark as read',
      position: 'top'
    })
  }
}

// 모두 읽음 처리
const markAllAsRead = async () => {
  try {
    await notificationApi.markAllAsRead()
    await fetchNotifications()
    $q.notify({
      type: 'positive',
      message: 'All notifications marked as read',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to mark all as read:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to mark all as read',
      position: 'top'
    })
  }
}

// 삭제
const handleDelete = async (notificationId: number) => {
  try {
    await notificationApi.deleteNotification(notificationId)
    await fetchNotifications()
    $q.notify({
      type: 'positive',
      message: 'Notification deleted',
      position: 'top'
    })
  } catch (error) {
    console.error('Failed to delete notification:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to delete notification',
      position: 'top'
    })
  }
}

// 알림 클릭 처리
const handleNotificationClick = (notification: Notification) => {
  // 읽음 처리
  if (!notification.isRead) {
    handleMarkAsRead(notification.id)
  }

  // 관련 페이지로 이동
  if (notification.taskId) {
    router.push({ name: 'TaskManage (Manager)', query: { taskId: notification.taskId } })
  }
}

// 전체 알림 보기
const viewAllNotifications = () => {
  router.push({ name: 'NotificationList' })
}

// 실시간 폴링 시작
const startPolling = () => {
  pollingInterval = setInterval(() => {
    fetchNotifications()
  }, 30000) // 30초마다 업데이트
}

// 폴링 중지
const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

onMounted(() => {
  fetchNotifications()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.notification-dropdown {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
