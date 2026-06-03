import { AxiosResponse } from 'axios';
import service from '@/api/common/axios-voyagerss';

export interface DashboardStatistics {
    totalTasks: number;
    openTasks: number;
    closedTasks: number;
    cancelledTasks: number;
    totalWorkers: number;
    activeWorkers: number;
    totalTeams: number;
    activeTeams: number;
    totalNotifications: number;
    unreadNotifications: number;
    tasksByStatus: TaskStatusCount[];
    tasksByRegion: TaskRegionCount[];
    workersByTeam: WorkerTeamCount[];
    recentActivities: RecentActivity[];
}

export interface TaskStatusCount {
    status: string;
    count: number;
}

export interface TaskRegionCount {
    region: string;
    count: number;
}

export interface WorkerTeamCount {
    teamId: number;
    teamName: string;
    workerCount: number;
}

export interface RecentActivity {
    id: string;
    type: 'TASK_CREATED' | 'TASK_UPDATED' | 'JOIN_REQUEST' | 'JOIN_APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT';
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
    color: string;
}

export interface TeamStatistics {
    teamId: number;
    teamName: string;
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    totalMembers: number;
    activeMembers: number;
    totalShops: number;
    checkInRate: number;
}

export interface WorkerStatistics {
    workerId: number;
    workerName: string;
    totalTasksAssigned: number;
    completedTasks: number;
    cancelledTasks: number;
    checkInCount: number;
    checkOutCount: number;
    averageWorkHours: number;
}

export interface TaskStatisticsByDateRange {
    totalTasks: number;
    tasksByDate: { [key: string]: number };
    tasksByStatus: { [key: string]: number };
    tasksByRegion: { [key: string]: number };
}

const apiStatistics = {
    getDashboardStatistics(): Promise<AxiosResponse<DashboardStatistics>> {
        return service.get('/workschd/statistics/dashboard');
    },

    getTeamStatistics(teamId: number): Promise<AxiosResponse<TeamStatistics>> {
        return service.get(`/workschd/statistics/team/${teamId}`);
    },

    getWorkerStatistics(workerId: number): Promise<AxiosResponse<WorkerStatistics>> {
        return service.get(`/workschd/statistics/worker/${workerId}`);
    },

    getTaskStatisticsByDateRange(startDate: string, endDate: string): Promise<AxiosResponse<TaskStatisticsByDateRange>> {
        return service.get('/workschd/statistics/tasks/date-range', {
            params: { startDate, endDate }
        });
    }
};

export default apiStatistics;
