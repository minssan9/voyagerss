import { TaskStatus, RequestStatus } from './status';

export interface Task {
  id?: number;
  title: string;
  description: string;
  workerCount: number;
  startDateTime: string;
  endDateTime: string;
  status: TaskStatus | string;
  teamId: number | null;
  shopId: number | null;
  shopName?: string;
  teamName?: string;
  active: boolean;
  taskEmployees?: TaskEmployee[];
}

// Utility function to create a default task with current date
export function createDefaultTask(teamId: number | null = null): Task {
  return {
    title: '',
    description: '',
    workerCount: 1,
    startDateTime: new Date().toISOString().split('T')[0] + 'T08:00:00',
    endDateTime: new Date().toISOString().split('T')[0] + 'T17:00:00',
    status: TaskStatus.SCHEDULED,
    teamId: teamId || 0,
    shopId: null,
    active: true
  };
}

export interface TaskEmployee {
  id?: number;
  taskId: number;
  taskTitle?: string;
  taskStatus?: TaskStatus | string;
  accountId: number;
  accountName?: string;
  accountEmail?: string;
  status: RequestStatus | string;
  requestDate?: string;
  approvedAt?: string;
  rejectedAt?: string;
  reason?: string;
  content?: string;
  description?: string;
  progress?: number;
  result?: string;
  type?: string;
  size: number;
}

export interface JoinRequest {
  id?: number;
  taskId: number;
  accountId: number;
  workerName: string;
  requestDate: string;
  status: RequestStatus | string;
} 