import axios, { AxiosResponse } from 'axios';

const BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/workschd';

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

/**
 * Account API client
 */
const apiAccount = {
    /**
     * Get account by ID
     */
    getAccount(accountId: number): Promise<AxiosResponse<Account>> {
        return axios.get(`${BASE_URL}${API_PREFIX}/accounts/${accountId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    },

    /**
     * Update user profile
     */
    updateProfile(profileData: ProfileUpdateData): Promise<AxiosResponse<Account>> {
        return axios.put(`${BASE_URL}${API_PREFIX}/accounts/profile`, profileData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    },

    /**
     * Change password
     */
    changePassword(passwordData: ChangePasswordData): Promise<AxiosResponse<{ success: boolean; message: string }>> {
        return axios.post(`${BASE_URL}${API_PREFIX}/accounts/change-password`, passwordData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
};

export default apiAccount;
