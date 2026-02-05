import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/stores/common/store_user';

interface Notification {
  id: number;
  type: string;
  message: string;
  taskId: number;
  createdAt: string;
  isRead: boolean;
  metadata: any;
}

export function useWebSocket() {
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const userStore = useUserStore();

  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);

  /**
   * Connect to WebSocket server
   */
  const connect = () => {
    if (socket.value?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:6172';

    socket.value = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.value.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.value?.id);
      connected.value = true;

      // Authenticate with user ID
      if (userStore.accountId) {
        socket.value?.emit('authenticate', userStore.accountId);
      }
    });

    socket.value.on('authenticated', (data: any) => {
      console.log('[WebSocket] Authenticated:', data);
    });

    socket.value.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      connected.value = false;
    });

    socket.value.on('notification', (notification: Notification) => {
      console.log('[WebSocket] Received notification:', notification);

      // Add to notifications list
      notifications.value.unshift(notification);

      // Update unread count
      if (!notification.isRead) {
        unreadCount.value++;
      }

      // Trigger browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('새 알림', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    });

    socket.value.on('connect_error', (error: Error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  };

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
      console.log('[WebSocket] Manually disconnected');
    }
  };

  /**
   * Mark notification as read (local only)
   */
  const markAsRead = (notificationId: number) => {
    const notification = notifications.value.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  };

  /**
   * Clear all notifications
   */
  const clearNotifications = () => {
    notifications.value = [];
    unreadCount.value = 0;
  };

  /**
   * Request browser notification permission
   */
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('[WebSocket] Notification permission:', permission);
    }
  };

  // Auto-connect when composable is used
  onMounted(() => {
    connect();
    requestNotificationPermission();
  });

  // Auto-disconnect on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    connected,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    clearNotifications
  };
}
