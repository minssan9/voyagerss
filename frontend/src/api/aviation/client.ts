import service from '@/api/axios-voyagerss'
import type { ApiResponse, Topic, KnowledgeData, WeatherImage, WeatherStatus, ValidationResult } from '../types/api';

const apiClient = service;

export const knowledgeApi = {
  getAll: async (): Promise<KnowledgeData> => {
    const response = await apiClient.get<KnowledgeData>('/api/knowledge');
    return response.data;
  },

  update: async (day: number, data: { topic: string; description?: string }): Promise<void> => {
    await apiClient.put(`/api/knowledge/${day}`, data);
  },

  validate: async (): Promise<ValidationResult> => {
    const response = await apiClient.post<ValidationResult>('/api/knowledge/validate');
    return response.data;
  }
};

export const topicsApi = {
  getAll: async (): Promise<Topic[]> => {
    const response = await apiClient.get<Topic[]>('/api/topics');
    return response.data;
  },

  getSchedule: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/api/topics/schedule');
    return response.data;
  },

  create: async (data: { name: string; description?: string; dayOfWeek: number }): Promise<{ id: number }> => {
    const response = await apiClient.post<{ success: boolean; id: number }>('/api/topics', data);
    return { id: response.data.id };
  },

  update: async (id: number, data: { name: string; description?: string; dayOfWeek: number }): Promise<void> => {
    await apiClient.put(`/api/topics/${id}`, data);
  },

  getStats: async (): Promise<any> => {
    const response = await apiClient.get<any>('/api/topics/stats');
    return response.data;
  }
};

export const backupsApi = {
  create: async (): Promise<{ filename: string }> => {
    const response = await apiClient.post<{ success: boolean; filename: string }>('/api/knowledge/backup');
    return { filename: response.data.filename };
  },

  restore: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('backup', file);
    await apiClient.post('/api/knowledge/restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export const weatherApi = {
  collect: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/api/weather/collect');
    return response.data;
  },

  getImages: async (limit = 20, startDate?: string, endDate?: string): Promise<ApiResponse<{ count: number; images: WeatherImage[] }> & { images?: WeatherImage[]; count?: number }> => {
    const params: any = { limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<ApiResponse<{ count: number; images: WeatherImage[] }> & { images?: WeatherImage[]; count?: number }>('/api/weather/images', {
      params
    });
    return response.data;
  },

  getStatus: async (): Promise<ApiResponse<WeatherStatus>> => {
    const response = await apiClient.get<ApiResponse<WeatherStatus>>('/api/weather/kma/status');
    return response.data;
  },

  cleanup: async (daysToKeep = 7): Promise<ApiResponse<{ deletedCount: number }>> => {
    const response = await apiClient.post<ApiResponse<{ deletedCount: number }>>('/api/weather/cleanup', { daysToKeep });
    return response.data;
  },

  getGatheringEnabled: async (): Promise<ApiResponse<{ enabled: boolean }>> => {
    const response = await apiClient.get<ApiResponse<{ enabled: boolean }>>('/api/weather/gathering/enabled');
    return response.data;
  },

  setGatheringEnabled: async (enabled: boolean): Promise<ApiResponse<{ enabled: boolean; message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ enabled: boolean; message: string }>>('/api/weather/gathering/enabled', { enabled });
    return response.data;
  }
};



