import { AxiosResponse } from 'axios';
import service from '@/api/common/axios-voyagerss';

export interface Account {
    accountId: number;
    username: string;
    email: string;
    name?: string;
    phone?: string;
    role?: string;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ProfileUpdateData {
    name?: string;
    phone?: string;
}

export interface ChangePasswordData {
    oldPassword: string;
    newPassword: string;
}

const apiAccount = {
    getAccount(accountId: number): Promise<AxiosResponse<Account>> {
        return service.get(`/workschd/accounts/${accountId}`);
    },

    updateProfile(profileData: ProfileUpdateData): Promise<AxiosResponse<Account>> {
        return service.put('/workschd/accounts/profile', profileData);
    },

    changePassword(passwordData: ChangePasswordData): Promise<AxiosResponse<{ success: boolean; message: string }>> {
        return service.post('/workschd/accounts/change-password', passwordData);
    }
};

export default apiAccount;
