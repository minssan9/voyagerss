import { AxiosResponse } from 'axios';
import service from '@/api/axios-voyagerss';

// Define interfaces for schedule configuration
export interface DayValueConfig {
  value: string;
  label: string;
}

export interface MonthValueConfig {
  value: number;
  label: string;
}
export interface DayConfig {
  [day: string]: number; // e.g., MONDAY: 1
}

export interface MonthConfig {
  [month: number]: number; // e.g., 1: 4 (January: 4 days)
}



// Constants for schedule configuration
export const daysOfWeek: DayValueConfig[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' }
];

export const months: MonthValueConfig[] = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];


const baesURL = `account` 
const apiAccountSchedule = { 
  // Schedule preferences methods
  getSchedulePreferences(accountId) {
    return service.get(`${baesURL}/${accountId}/schedule-preferences`)
  },

  saveSchedulePreferences(accountId, preferences) {
    return service.post(`${baesURL}/${accountId}/schedule-preferences`, preferences)
  },

  // Unavailable dates methods
  getUnavailableDates(accountId) {
    return service.get(`${baesURL}/${accountId}/unavailable-dates`)
  },

  saveUnavailableDates(accountId, dates) {
    return service.post(`${baesURL}/${accountId}/unavailable-dates`, { dates })
  }
}

export default apiAccountSchedule;