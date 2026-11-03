import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useSquareBuildCards(enabled) {
  return useQuery({
    queryKey: ['square-build-card-source'],
    enabled,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await base44.functions.invoke('syncSquareCatalog', { build_cards_only: true });
      if (response.data?.source !== 'square' || !Array.isArray(response.data.items)) {
        throw new Error('The full Square card catalog was not returned. Refresh from Square to try again.');
      }
      return response.data;
    },
  });
}