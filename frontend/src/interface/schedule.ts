export interface ScheduleConfig {
  minStaffPerDay: Record<string, number>;
  maxOffDaysPerMonth: Record<number, number>;
}

export interface DayConfig {
  value: string;
  label: string;
}

export interface MonthConfig {
  value: number;
  label: string;
} 