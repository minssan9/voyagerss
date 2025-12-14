import { AxiosResponse } from 'axios';

// Common pagination interfaces
export interface PageDTO {
  page: number;
  size: number;
  sort?: string;
}

export interface PageResponseDTO<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Default pagination parameters
export const DEFAULT_PAGE_DTO: PageDTO = {
  page: 0,
  size: 10,
  sort: 'id,desc'
};

// Helper function to create pagination parameters
export function createPageParams(page: number = 0, size: number = 10, sort: string = 'id,desc'): PageDTO {
  return {
    page,
    size,
    sort
  };
}

// Helper function to parse sort parameter in the format expected by Spring's Pageable
export function parseSortParam(sort: string | undefined): string | undefined {
  if (!sort) return undefined;
  
  const sortParts = sort.split(',');
  if (sortParts.length === 2) {
    return `${sortParts[0]},${sortParts[1]}`;
  }
  return sort;
} 