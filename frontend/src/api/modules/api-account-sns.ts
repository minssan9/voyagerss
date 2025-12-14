import { AxiosResponse } from 'axios';
import service from '@/api/axios-voyagerss';

export interface AccountSnsDTO {
  accountSnsId?: number;
  userId: string;
  snsEmail?: string;
  providerType: string;
  snsPhone?: string;
  expired?: Date;
  emailVerifiedYn: string;
  profileImageUrl?: string;
  profileVideoUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: number;
}

export default {
  create(data: AccountSnsDTO): Promise<AxiosResponse> {
    return service.post('/account-sns', data);
  },

  update(id: number, data: AccountSnsDTO): Promise<AxiosResponse> {
    return service.put(`/account-sns/${id}`, data);
  },

  delete(id: number): Promise<AxiosResponse> {
    return service.delete(`/account-sns/${id}`);
  },

  getById(id: number): Promise<AxiosResponse> {
    return service.get(`/account-sns/${id}`);
  },

  getByAccountId(accountId: number): Promise<AxiosResponse> {
    return service.get(`/account-sns/account/${accountId}`);
  }
}; 