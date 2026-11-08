import service from '@/api/common/axios-voyagerss';

export interface ConfigCatalogItem {
  key: string;
  category: string;
  description: string | null;
  isSecret: boolean;
}

export interface ConfigDetail {
  key: string;
  value: string;
  isEncrypted: boolean;
  description?: string | null;
  category: string;
  updatedBy?: string | null;
  updatedAt: string;
  createdAt: string;
}

export async function fetchConfigCatalog(categories: string[]): Promise<ConfigCatalogItem[]> {
  const qs = categories.length ? `?categories=${encodeURIComponent(categories.join(','))}` : '';
  const res = await service.get<{ data: ConfigCatalogItem[] }>(`/workschd/admin/config/catalog${qs}`);
  return res.data.data;
}

export async function ensureConfigCatalog(categories: string[]): Promise<number> {
  const res = await service.post<{ created: number }>('/workschd/admin/config/ensure-catalog', {
    categories,
  });
  return res.data.created;
}

export async function fetchConfigValue(key: string): Promise<ConfigDetail | null> {
  const res = await service.get<ConfigDetail>(`/workschd/admin/config/${encodeURIComponent(key)}`);
  return res.data;
}

export async function saveConfigValue(
  key: string,
  payload: { value: string; description?: string; category?: string; isEncrypted?: boolean },
): Promise<void> {
  await service.put(`/workschd/admin/config/${encodeURIComponent(key)}`, payload);
}

export async function reloadSystemConfig(): Promise<void> {
  await service.post('/workschd/admin/config/reload');
}
