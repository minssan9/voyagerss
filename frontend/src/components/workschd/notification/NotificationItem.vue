<template>
  <q-item
    clickable
    :class="{ 'bg-blue-1': !notification.isRead }"
    @click="$emit('click', notification)"
  >
    <q-item-section avatar>
      <q-avatar
        :icon="getNotificationIcon(notification.type)"
        :color="getNotificationColor(notification.type)"
        text-color="white"
      />
    </q-item-section>

    <q-item-section>
      <q-item-label class="text-weight-medium">
        {{ getNotificationTitle(notification.type) }}
      </q-item-label>
      <q-item-label caption lines="2">
        {{ notification.message }}
      </q-item-label>
      <q-item-label caption class="text-grey-6">
        {{ formatDate(notification.createdAt) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side top>
      <div class="row items-center">
        <q-btn
          v-if="!notification.isRead"
          flat
          dense
          round
          size="sm"
          icon="done"
          color="primary"
          @click.stop="$emit('read', notification.id)"
        >
          <q-tooltip>Mark as read</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="delete"
          color="negative"
          @click.stop="$emit('delete', notification.id)"
        >
          <q-tooltip>Delete</q-tooltip>
        </q-btn>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { Notification, NotificationType } from '@/api/workschd/api-notification'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  notification: Notification
}

defineProps<Props>()

defineEmits<{
  (e: 'click', notification: Notification): void
  (e: 'read', id: number): void
  (e: 'delete', id: number): void
}>()

const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.TASK_CREATED:
      return 'add_task'
    case NotificationType.JOIN_REQUEST:
      return 'person_add'
    case NotificationType.JOIN_APPROVED:
      return 'check_circle'
    case NotificationType.JOIN_REJECTED:
      return 'cancel'
    case NotificationType.TASK_CLOSED:
      return 'lock'
    case NotificationType.TASK_UPDATED:
      return 'edit'
    case NotificationType.TASK_CANCELLED:
      return 'event_busy'
    default:
      return 'notifications'
  }
}

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.TASK_CREATED:
      return 'blue'
    case NotificationType.JOIN_REQUEST:
      return 'orange'
    case NotificationType.JOIN_APPROVED:
      return 'green'
    case NotificationType.JOIN_REJECTED:
      return 'red'
    case NotificationType.TASK_CLOSED:
      return 'grey'
    case NotificationType.TASK_UPDATED:
      return 'purple'
    case NotificationType.TASK_CANCELLED:
      return 'red-8'
    default:
      return 'primary'
  }
}

const getNotificationTitle = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.TASK_CREATED:
      return 'New Task Created'
    case NotificationType.JOIN_REQUEST:
      return 'Join Request Received'
    case NotificationType.JOIN_APPROVED:
      return 'Join Request Approved'
    case NotificationType.JOIN_REJECTED:
      return 'Join Request Rejected'
    case NotificationType.TASK_CLOSED:
      return 'Task Closed'
    case NotificationType.TASK_UPDATED:
      return 'Task Updated'
    case NotificationType.TASK_CANCELLED:
      return 'Task Cancelled'
    default:
      return 'Notification'
  }
}

const formatDate = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch (error) {
    return dateString
  }
}
</script>

<style scoped>
.q-item {
  transition: background-color 0.2s;
}

.q-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
