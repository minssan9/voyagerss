import { AxiosResponse } from 'axios';
import service from "@/api/axios-voyagerss.js";

export interface SubscriptionDTO {
  planType: 'premium' | 'basic' | 'starter' | 'small';
  price: number;
}

export default {
  subscribe(planType: SubscriptionDTO['planType']): Promise<AxiosResponse> {
    return service.post('/subscription', { planType });
  },

  getCurrentPlan(): Promise<AxiosResponse> {
    return service.get('/subscription/current');
  }
}; 