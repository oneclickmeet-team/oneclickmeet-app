import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CandidateSearchParams, PlaceInput, PlaceListParams } from '@/types/api';
import type { PlaceId } from '@/types/ids';

import { placeApi } from '../api/placeApi';

// queryKey는 설계서 8장 표를 따른다.
export const placeKeys = {
  all: ['places'] as const,
  list: (filters: Omit<PlaceListParams, 'page'>) => ['places', filters] as const,
  detail: (id: PlaceId) => ['place', id] as const,
  candidates: (params: CandidateSearchParams) => ['place-candidates', params] as const,
  regions: ['regions'] as const,
};

export function useRegions() {
  return useQuery({
    queryKey: placeKeys.regions,
    queryFn: () => placeApi.regions(),
    staleTime: Infinity,
  });
}

export function usePlaceList(filters: Omit<PlaceListParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: placeKeys.list(filters),
    queryFn: ({ pageParam }) => placeApi.list({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
}

export function usePlace(id: PlaceId | null) {
  return useQuery({
    queryKey: placeKeys.detail(id ?? (0 as PlaceId)),
    queryFn: () => placeApi.get(id!),
    enabled: id !== null,
  });
}

export function useCandidateSearch(params: CandidateSearchParams, enabled = true) {
  const hasInput =
    Boolean(params.query?.trim()) || params.regionId !== undefined || params.latitude !== undefined;
  return useQuery({
    queryKey: placeKeys.candidates(params),
    queryFn: () => placeApi.searchCandidates({ size: 15, ...params }),
    enabled: enabled && hasInput,
    staleTime: 60_000,
  });
}

export function useRecognizeLink() {
  return useMutation({ mutationFn: placeApi.recognizeLink });
}

export function useRecognizeImage() {
  return useMutation({ mutationFn: placeApi.recognizeImage });
}

export function useCreatePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceInput) => placeApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placeKeys.all }),
  });
}

export function useDeletePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: PlaceId) => placeApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: placeKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: placeKeys.all });
    },
  });
}
