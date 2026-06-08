import { AxiosResponse } from 'axios';
import service from '@/api/common/axios-voyagerss';

export interface RbacRole {
  id: number;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { rolePermissions: number; subjectRoles: number };
}

export interface RbacPermission {
  id: number;
  code: string;
  name: string;
  type: 'PAGE' | 'API';
  module: string;
  resource: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RbacSubjectRole {
  id: number;
  module: string;
  subjectId: string;
  roleId: number;
  role: RbacRole;
  createdAt: string;
}

const apiRbac = {
  // Roles
  listRoles(): Promise<AxiosResponse<{ data: RbacRole[] }>> {
    return service.get('/rbac/roles');
  },
  getRole(id: number): Promise<AxiosResponse<{ data: RbacRole & { rolePermissions: { permission: RbacPermission }[] } }>> {
    return service.get(`/rbac/roles/${id}`);
  },
  createRole(data: { code: string; name: string; description?: string }): Promise<AxiosResponse<{ data: RbacRole }>> {
    return service.post('/rbac/roles', data);
  },
  updateRole(id: number, data: { name?: string; description?: string }): Promise<AxiosResponse<{ data: RbacRole }>> {
    return service.put(`/rbac/roles/${id}`, data);
  },
  deleteRole(id: number): Promise<AxiosResponse<void>> {
    return service.delete(`/rbac/roles/${id}`);
  },

  // Permissions
  listPermissions(params?: { module?: string; type?: string }): Promise<AxiosResponse<{ data: RbacPermission[] }>> {
    return service.get('/rbac/permissions', { params });
  },
  createPermission(data: {
    code: string; name: string; type: 'PAGE' | 'API';
    module: string; resource: string; description?: string;
  }): Promise<AxiosResponse<{ data: RbacPermission }>> {
    return service.post('/rbac/permissions', data);
  },
  updatePermission(id: number, data: Partial<RbacPermission>): Promise<AxiosResponse<{ data: RbacPermission }>> {
    return service.put(`/rbac/permissions/${id}`, data);
  },
  deletePermission(id: number): Promise<AxiosResponse<void>> {
    return service.delete(`/rbac/permissions/${id}`);
  },

  // Role-Permission assignments
  getRolePermissions(roleId: number): Promise<AxiosResponse<{ data: { permission: RbacPermission }[] }>> {
    return service.get(`/rbac/roles/${roleId}/permissions`);
  },
  setRolePermissions(roleId: number, permissionIds: number[]): Promise<AxiosResponse<{ message: string }>> {
    return service.put(`/rbac/roles/${roleId}/permissions`, { permissionIds });
  },

  // Subject-Role assignments
  listSubjectRoles(params?: { module?: string; subjectId?: string }): Promise<AxiosResponse<{ data: RbacSubjectRole[] }>> {
    return service.get('/rbac/subjects', { params });
  },
  getSubjectRoles(module: string, subjectId: string): Promise<AxiosResponse<{ data: RbacSubjectRole[] }>> {
    return service.get(`/rbac/subjects/${module}/${subjectId}/roles`);
  },
  setSubjectRoles(module: string, subjectId: string, roleIds: number[]): Promise<AxiosResponse<{ message: string }>> {
    return service.put(`/rbac/subjects/${module}/${subjectId}/roles`, { roleIds });
  },
  getSubjectPermissions(module: string, subjectId: string): Promise<AxiosResponse<{ data: RbacPermission[] }>> {
    return service.get(`/rbac/subjects/${module}/${subjectId}/permissions`);
  },
};

export default apiRbac;
