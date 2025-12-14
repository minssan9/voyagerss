import service from "@/api/axios-voyagerss"; // Assuming this is the shared axios instance
import { AxiosResponse } from 'axios';
import { DayConfig, MonthConfig } from '@/api/modules/api-account-schedule';

export interface AdditionalOptions {
  allowWeekendWork: boolean;
  enforceMinimumRest: boolean;
  maxConsecutiveWorkDays: number;
  scheduleGenerationFrequency: string; // e.g., 'MONTHLY'
}

export interface ScheduleConfig {
  minStaffPerDay: DayConfig;
  maxOffDaysPerMonth: MonthConfig;
  additionalOptions?: AdditionalOptions;
}

// Default values for schedule configuration
export const defaultMinStaffPerDay: DayConfig = {
  MONDAY: 1,
  TUESDAY: 1,
  WEDNESDAY: 1,
  THURSDAY: 1,
  FRIDAY: 1,
  SATURDAY: 1,
  SUNDAY: 1
};

export const defaultMaxOffDaysPerMonth: MonthConfig = {
  1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4,
  7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4
};

export const defaultAdditionalOptions: AdditionalOptions = {
  allowWeekendWork: true,
  enforceMinimumRest: true,
  maxConsecutiveWorkDays: 5,
  scheduleGenerationFrequency: 'MONTHLY'
};

/**
 * API functions for team schedule management
 */
export const apiTeamSchedule = {
  /**
   * Fetch schedule configuration for a team
   * @param teamId - The ID of the team
   * @returns Promise with the schedule configuration
   */
  getTeamScheduleConfig(teamId: number): Promise<AxiosResponse<ScheduleConfig>> {
    return service.get(`/team/${teamId}/schedule-config`);
  },

  /**
   * Save schedule configuration for a team
   * @param teamId - The ID of the team
   * @param config - The schedule configuration to save
   * @returns Promise with the result of the operation
   */
  saveTeamScheduleConfig(teamId: number, config: ScheduleConfig): Promise<AxiosResponse<void>> {
    return service.post(`/team/${teamId}/schedule-config`, config);
  }
}; 
