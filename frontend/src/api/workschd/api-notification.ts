import { AxiosResponse } from 'axios'
import service from '@/api/common/axios-voyagerss'
import { PageResponseDTO } from '@/api/common/api-common'

export interface Notification {
  id: number
  accountId: number
  taskId?: number
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  message: string
  metadata?: any
  sentAt?: string
  isRead: boolean
  createdAt: string
}

export enum NotificationType {
  TASK_CREATED = 'TASK_CREATED',           // 장례식 등록
  JOIN_REQUEST = 'JOIN_REQUEST',           // 참여 신청
  JOIN_APPROVED = 'JOIN_APPROVED',         // 참여 승인
  JOIN_REJECTED = 'JOIN_REJECTED',         // 참여 거절
  TASK_CLOSED = 'TASK_CLOSED',            // 인원 마감
  TASK_UPDATED = 'TASK_UPDATED',          // 장례식 정보 변경
  TASK_CANCELLED = 'TASK_CANCELLED'       // 장례식 취소
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  KAKAO = 'KAKAO',
  SMS = 'SMS'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

// 알림 목록 조회
const getNotifications = (params?: {
  page?: number
  size?: number
  type?: NotificationType
  status?: NotificationStatus
  isRead?: boolean
}): Promise<AxiosResponse<PageResponseDTO<Notification>>> => {
  return service.get('/workschd/notifications', { params })
}

// 알림 상세 조회
const getNotificationById = (id: number): Promise<AxiosResponse<Notification>> => {
  return service.get(`/workschd/notifications/${id}`)
}

// 알림 읽음 처리
const markAsRead = (id: number): Promise<AxiosResponse<void>> => {
  return service.put(`/workschd/notifications/${id}/read`)
}

// 모든 알림 읽음 처리
const markAllAsRead = (): Promise<AxiosResponse<void>> => {
  return service.put('/workschd/notifications/read-all')
}

// 알림 삭제
const deleteNotification = (id: number): Promise<AxiosResponse<void>> => {
  return service.delete(`/workschd/notifications/${id}`)
}

// 읽지 않은 알림 개수 조회
const getUnreadCount = (): Promise<AxiosResponse<{ count: number }>> => {
  return service.get('/workschd/notifications/unread-count')
}

export default {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
}
