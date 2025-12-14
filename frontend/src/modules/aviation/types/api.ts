export interface Topic {
  id: number;
  name: string;
  description: string;
  day_of_month: number;
  is_active: boolean;
}

export interface KnowledgeData {
  [key: number]: {
    topic: string;
    description?: string;
  };
}

export interface WeatherImage {
  filename: string;
  size: number;
  sizeKB: number;
  sizeMB: number;
  created: string;
  modified: string;
  capturedAt?: string;
  filepath: string;
}

export interface WeatherStatus {
  status: string;
  currentTimestamp: string;
  testUrl: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  timestamp?: string;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  stats?: any;
}


