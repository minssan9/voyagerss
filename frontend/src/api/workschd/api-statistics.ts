import axios, { AxiosResponse } from 'axios';

const BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/workschd';

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

/**
 * Statistics API client
 */
const apiStatistics = {
    /**
     * Get dashboard statistics (Admin/Team Leader only)
     */
    getDashboardStatistics(): Promise<AxiosResponse<DashboardStatistics>> {
        return axios.get(`${BASE_URL}${API_PREFIX}/statistics/dashboard`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    },

    /**
     * Get team statistics
     */
    getTeamStatistics(teamId: number): Promise<AxiosResponse<TeamStatistics>> {
        return axios.get(`${BASE_URL}${API_PREFIX}/statistics/team/${teamId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    },

    /**
     * Get worker statistics
     */
    getWorkerStatistics(workerId: number): Promise<AxiosResponse<WorkerStatistics>> {
        return axios.get(`${BASE_URL}${API_PREFIX}/statistics/worker/${workerId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    },

    /**
     * Get task statistics by date range
     */
    getTaskStatisticsByDateRange(startDate: string, endDate: string): Promise<AxiosResponse<TaskStatisticsByDateRange>> {
        return axios.get(`${BASE_URL}${API_PREFIX}/statistics/tasks/date-range`, {
            params: { startDate, endDate },
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
};

export default apiStatistics;
