import {AxiosResponse} from 'axios';
import service from '@/api/common/axios-voyagerss'; 


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
    return service.get(`/workschd/team/${teamId}/shop`);
  },

  fetchShops: (): Promise<AxiosResponse<Shop[]>> => {
    return service.get('/workschd/shop')
  },

  getActiveShopsByTeamId: (teamId: number): Promise<AxiosResponse<Shop[]>> => {
    return service.get(`/workschd/team/${teamId}/shop/active`)
  },

  createShop: (teamId: number, shop: Shop): Promise<AxiosResponse<Shop>> => {
    return service.post(`/workschd/team/${teamId}/shop`, shop);
  },

  updateShop: (teamId: number, shopId: number, shop: Shop): Promise<AxiosResponse<Shop>> => {
    return service.put(`/workschd/team/${teamId}/shop/${shopId}`, shop);
  },

  deleteShop: (teamId: number, shopId: number): Promise<AxiosResponse<void>> => {
    return service.delete(`/workschd/team/${teamId}/shop/${shopId}`);
  }
};

export default apiTeamShop; 

