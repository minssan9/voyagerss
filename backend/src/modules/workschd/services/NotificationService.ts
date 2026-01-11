import { workschdPrisma as prisma } from '../../../config/prisma';
import { SolapiProvider } from './notification/SolapiProvider';
import { EmailProvider } from './notification/EmailProvider';

export enum NotificationType {
  TASK_CREATED = 'TASK_CREATED',
  JOIN_REQUEST = 'JOIN_REQUEST',
  JOIN_APPROVED = 'JOIN_APPROVED',
  JOIN_REJECTED = 'JOIN_REJECTED',
  TASK_CLOSED = 'TASK_CLOSED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_CANCELLED = 'TASK_CANCELLED'
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  KAKAO = 'KAKAO',
  SMS = 'SMS'
}

/**
 * 알림 서비스
 * - 장례식 등록/변경/취소 알림
 * - 참여 신청/승인/거절 알림
 * - 인원 마감 알림
 */
export class NotificationService {
  private solapiProvider: SolapiProvider;
  private emailProvider: EmailProvider;

  constructor() {
    this.solapiProvider = new SolapiProvider();
    this.emailProvider = new EmailProvider();
  }

  /**
   * 장례식 등록 시 팀 도우미들에게 알림 발송
   */
  async sendTaskCreatedNotification(taskId: number): Promise<void> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          shop: true,
          team: {
            include: {
              teamMembers: {
                include: {
                  account: {
                    include: { accountRoles: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      // 팀 내 도우미 필터링
      const helpers = task.team.teamMembers.filter(member =>
        member.account.accountRoles.some(role => role.roleType === 'HELPER')
      );

      console.log(`Sending task created notifications to ${helpers.length} helpers`);

      // 각 도우미에게 알림 발송
      for (const helper of helpers) {
        await this.createAndSendNotification({
          accountId: helper.accountId,
          taskId: task.id,
          type: NotificationType.TASK_CREATED,
          account: helper.account,
          task
        });
      }
    } catch (error) {
      console.error('Failed to send task created notifications:', error);
    }
  }

  /**
   * 참여 신청 시 팀장에게 알림
   */
  async sendJoinRequestNotification(
    taskId: number,
    helperAccountId: number
  ): Promise<void> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { shop: true }
      });

      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      const helper = await prisma.account.findUnique({
        where: { accountId: helperAccountId }
      });

      if (!helper) {
        console.error('Helper not found:', helperAccountId);
        return;
      }

      // 팀장 찾기
      const teamLeader = await prisma.teamMember.findFirst({
        where: {
          teamId: task.teamId,
          role: 'LEADER'
        },
        include: { account: true }
      });

      if (!teamLeader) {
        console.error('Team leader not found for team:', task.teamId);
        return;
      }

      await this.createAndSendNotification({
        accountId: teamLeader.accountId,
        taskId: task.id,
        type: NotificationType.JOIN_REQUEST,
        account: teamLeader.account,
        task,
        metadata: {
          helperName: helper.username,
          helperEmail: helper.email
        }
      });
    } catch (error) {
      console.error('Failed to send join request notification:', error);
    }
  }

  /**
   * 참여 승인 시 도우미에게 알림
   */
  async sendJoinApprovedNotification(
    accountId: number,
    taskId: number
  ): Promise<void> {
    try {
      const account = await prisma.account.findUnique({
        where: { accountId }
      });

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { shop: true }
      });

      if (!account || !task) {
        console.error('Account or task not found');
        return;
      }

      await this.createAndSendNotification({
        accountId,
        taskId,
        type: NotificationType.JOIN_APPROVED,
        account,
        task
      });
    } catch (error) {
      console.error('Failed to send join approved notification:', error);
    }
  }

  /**
   * 참여 거절 시 도우미에게 알림
   */
  async sendJoinRejectedNotification(
    accountId: number,
    taskId: number
  ): Promise<void> {
    try {
      const account = await prisma.account.findUnique({
        where: { accountId }
      });

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { shop: true }
      });

      if (!account || !task) {
        console.error('Account or task not found');
        return;
      }

      await this.createAndSendNotification({
        accountId,
        taskId,
        type: NotificationType.JOIN_REJECTED,
        account,
        task
      });
    } catch (error) {
      console.error('Failed to send join rejected notification:', error);
    }
  }

  /**
   * 인원 마감 시 팀 전체에 알림
   */
  async sendTaskClosedNotification(taskId: number): Promise<void> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          shop: true,
          team: {
            include: {
              teamMembers: {
                include: { account: true }
              }
            }
          }
        }
      });

      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      console.log(`Sending task closed notifications to ${task.team.teamMembers.length} team members`);

      // 팀 전체에 알림
      for (const member of task.team.teamMembers) {
        await this.createAndSendNotification({
          accountId: member.accountId,
          taskId: task.id,
          type: NotificationType.TASK_CLOSED,
          account: member.account,
          task
        });
      }
    } catch (error) {
      console.error('Failed to send task closed notifications:', error);
    }
  }

  /**
   * 알림 생성 및 발송 (내부 헬퍼)
   */
  private async createAndSendNotification(params: {
    accountId: number;
    taskId: number;
    type: NotificationType;
    account: any;
    task: any;
    metadata?: any;
  }): Promise<void> {
    const { accountId, taskId, type, account, task, metadata } = params;

    // 알림 메시지 생성
    const message = this.generateMessage(type, task, metadata);

    // DB에 알림 저장
    const notification = await prisma.notification.create({
      data: {
        accountId,
        taskId,
        type,
        channel: NotificationChannel.KAKAO,
        status: 'PENDING',
        message,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    // 비동기로 실제 알림 발송
    setImmediate(async () => {
      await this.sendActualNotification(notification.id, account, task, type, message);
    });
  }

  /**
   * 실제 알림 발송 (카카오톡 + 이메일)
   */
  private async sendActualNotification(
    notificationId: number,
    account: any,
    task: any,
    type: NotificationType,
    message: string
  ): Promise<void> {
    let kakaoSuccess = false;
    let emailSuccess = false;

    // 카카오톡 발송 (전화번호가 있는 경우)
    if (account.phone) {
      const templateId = this.getTemplateId(type);
      const variables = this.getTemplateVariables(type, task);

      kakaoSuccess = await this.solapiProvider.sendKakaoNotification({
        to: account.phone,
        templateId,
        variables
      });
    }

    // 이메일 발송
    if (account.email) {
      const emailHtml = this.generateEmailHtml(type, task, message);
      const subject = this.getEmailSubject(type);

      emailSuccess = await this.emailProvider.sendEmail({
        to: account.email,
        subject,
        html: emailHtml
      });
    }

    // 알림 상태 업데이트
    const status = kakaoSuccess || emailSuccess ? 'SENT' : 'FAILED';

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status,
        sentAt: new Date()
      }
    });
  }

  /**
   * 알림 메시지 생성
   */
  private generateMessage(type: NotificationType, task: any, metadata?: any): string {
    const startDate = new Date(task.startDateTime).toLocaleDateString('ko-KR');

    switch (type) {
      case NotificationType.TASK_CREATED:
        return `새로운 장례식이 등록되었습니다: ${task.title} (${task.shop.name}, ${startDate})`;

      case NotificationType.JOIN_REQUEST:
        return `${metadata?.helperName}님이 "${task.title}" 장례식 참여를 신청했습니다.`;

      case NotificationType.JOIN_APPROVED:
        return `"${task.title}" 장례식 참여 신청이 승인되었습니다.`;

      case NotificationType.JOIN_REJECTED:
        return `"${task.title}" 장례식 참여 신청이 거절되었습니다.`;

      case NotificationType.TASK_CLOSED:
        return `"${task.title}" 장례식 인원이 마감되었습니다. (${task.currentWorkerCount}/${task.workerCount}명)`;

      case NotificationType.TASK_UPDATED:
        return `"${task.title}" 장례식 정보가 변경되었습니다.`;

      case NotificationType.TASK_CANCELLED:
        return `"${task.title}" 장례식이 취소되었습니다.`;

      default:
        return '알림이 있습니다.';
    }
  }

  /**
   * 카카오톡 템플릿 ID 반환
   */
  private getTemplateId(type: NotificationType): string {
    // 실제 Solapi에 등록된 템플릿 ID로 변경 필요
    switch (type) {
      case NotificationType.TASK_CREATED:
        return 'TASK_CREATED_TEMPLATE';
      case NotificationType.JOIN_REQUEST:
        return 'JOIN_REQUEST_TEMPLATE';
      case NotificationType.JOIN_APPROVED:
        return 'JOIN_APPROVED_TEMPLATE';
      case NotificationType.JOIN_REJECTED:
        return 'JOIN_REJECTED_TEMPLATE';
      case NotificationType.TASK_CLOSED:
        return 'TASK_CLOSED_TEMPLATE';
      default:
        return 'DEFAULT_TEMPLATE';
    }
  }

  /**
   * 카카오톡 템플릿 변수 생성
   */
  private getTemplateVariables(type: NotificationType, task: any): any {
    const startDate = new Date(task.startDateTime).toLocaleDateString('ko-KR');
    const startTime = new Date(task.startDateTime).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      title: task.title,
      shopName: task.shop?.name || '',
      startDate,
      startTime,
      workerCount: task.workerCount,
      currentWorkerCount: task.currentWorkerCount
    };
  }

  /**
   * 이메일 제목 생성
   */
  private getEmailSubject(type: NotificationType): string {
    switch (type) {
      case NotificationType.TASK_CREATED:
        return '[Workschd] 새로운 장례식이 등록되었습니다';
      case NotificationType.JOIN_REQUEST:
        return '[Workschd] 참여 신청이 있습니다';
      case NotificationType.JOIN_APPROVED:
        return '[Workschd] 참여 신청이 승인되었습니다';
      case NotificationType.JOIN_REJECTED:
        return '[Workschd] 참여 신청이 거절되었습니다';
      case NotificationType.TASK_CLOSED:
        return '[Workschd] 인원이 마감되었습니다';
      case NotificationType.TASK_UPDATED:
        return '[Workschd] 장례식 정보가 변경되었습니다';
      case NotificationType.TASK_CANCELLED:
        return '[Workschd] 장례식이 취소되었습니다';
      default:
        return '[Workschd] 알림';
    }
  }

  /**
   * 이메일 HTML 생성
   */
  private generateEmailHtml(type: NotificationType, task: any, message: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const startDate = new Date(task.startDateTime).toLocaleDateString('ko-KR');
    const startTime = new Date(task.startDateTime).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let content = `
      <p>${message}</p>
      <hr>
      <h3>상세 정보</h3>
      <ul>
        <li><strong>제목:</strong> ${task.title}</li>
        <li><strong>장례식장:</strong> ${task.shop?.name || ''}</li>
        <li><strong>일시:</strong> ${startDate} ${startTime}</li>
        <li><strong>필요 인원:</strong> ${task.workerCount}명</li>
        <li><strong>현재 인원:</strong> ${task.currentWorkerCount}명</li>
      </ul>
    `;

    if (task.description) {
      content += `<p><strong>설명:</strong><br>${task.description}</p>`;
    }

    return this.emailProvider.createEmailTemplate({
      title: this.getEmailSubject(type),
      content,
      buttonText: '자세히 보기',
      buttonUrl: `${frontendUrl}/workschd/task/${task.id}`
    });
  }

  /**
   * 알림 목록 조회
   */
  async getNotifications(params: {
    accountId: number;
    page: number;
    size: number;
    type?: string;
    status?: string;
  }): Promise<{ content: any[]; totalElements: number; totalPages: number }> {
    const where: any = { accountId: params.accountId };

    if (params.type) {
      where.type = params.type;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          task: {
            include: { shop: true }
          }
        },
        skip: params.page * params.size,
        take: params.size,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where })
    ]);

    return {
      content: notifications,
      totalElements: total,
      totalPages: Math.ceil(total / params.size)
    };
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: number, accountId: number): Promise<boolean> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification || notification.accountId !== accountId) {
        return false;
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
      });

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * 알림 삭제
   */
  async deleteNotification(notificationId: number, accountId: number): Promise<boolean> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification || notification.accountId !== accountId) {
        return false;
      }

      await prisma.notification.delete({
        where: { id: notificationId }
      });

      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  async getUnreadCount(accountId: number): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          accountId,
          isRead: false
        }
      });

      return count;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(accountId: number): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: {
          accountId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  }
}
