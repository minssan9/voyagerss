import {AxiosResponse} from 'axios';
import service from '@/api/axios-voyagerss'; 


export interface Shop { 
  id?: number
  name: string
  teamId?: number
  region?: string
  active?: boolean
  isActive?: boolean; 
  address?: string;  
}
 


// Shop APIs
const apiTeamShop = {
  getShopsByTeamId: (teamId: number): Promise<AxiosResponse<Shop[]>> => {
    return service.get(`/team/${teamId}/shop`);
  },
 
  fetchShops: (): Promise<AxiosResponse<Shop[]>> => {
    return service.get('/shop')
  },

  getActiveShopsByTeamId: (teamId: number): Promise<AxiosResponse<Shop[]>> => {
    return service.get(`/team/${teamId}/shop/active`)
  },

  createShop: (teamId: number, shop: Shop): Promise<AxiosResponse<Shop>> => {
    return service.post(`/team/${teamId}/shop`, shop);
  },

  updateShop: (teamId: number, shopId: number, shop: Shop): Promise<AxiosResponse<Shop>> => {
    return service.put(`/team/${teamId}/shop/${shopId}`, shop);
  },

  deleteShop: (teamId: number, shopId: number): Promise<AxiosResponse<void>> => {
    return service.delete(`/team/${teamId}/shop/${shopId}`);
  }
};

export default apiTeamShop; 