import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Page, Service } from '../api/types';

export const useFeaturedServices = () =>
  useQuery({
    queryKey: ['services', 'featured'],
    queryFn: async () => {
      const { data } = await apiClient.get<Page<Service>>('/services', {
        params: { page: 1, limit: 4 },
      });
      return data.data;
    },
  });
