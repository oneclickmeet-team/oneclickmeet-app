// 장소 API (TRD P01~P09). mock/실서버 전환은 이 파일 안에서만 일어난다.
import { apiRequest } from '@/lib/apiClient';
import { mockPlaces } from '@/mocks/places';
import { isMockMode } from '@/stores/settingsStore';
import type {
  CandidateSearchParams,
  CandidateSearchResponse,
  PageResponse,
  PlaceCandidate,
  PlaceInput,
  PlaceListParams,
  PlaceResponse,
  RecognitionRequest,
  RecognitionResponse,
  Region,
  RegionsResponse,
} from '@/types/api';
import type { PlaceId, SharedPlaceId } from '@/types/ids';
import type { Candidate, Page, Place, Recognition } from '@/types/model';

function coords(lat: number | null, lng: number | null) {
  return lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null;
}

export function toPlace(res: PlaceResponse): Place {
  return {
    id: res.placeId as PlaceId,
    name: res.name,
    address: res.address,
    coords: coords(res.latitude, res.longitude),
    sourceUrl: res.sourceUrl,
    sharedPlaceId: res.sharedPlaceId === null ? null : (res.sharedPlaceId as SharedPlaceId),
    createdAt: res.createdAt,
  };
}

export function toCandidate(res: PlaceCandidate): Candidate {
  return {
    name: res.name,
    address: res.address,
    coords: coords(res.latitude, res.longitude),
    sourceUrl: res.sourceUrl,
    categoryLabel: res.categoryLabel,
    openingHours: res.openingHours,
  };
}

function toRecognition(res: RecognitionResponse): Recognition {
  return {
    found: res.status === 'CANDIDATES_FOUND' && res.candidates.length > 0,
    extractedQuery: res.extractedQuery,
    candidates: res.candidates.map(toCandidate),
    message: res.message,
  };
}

function toPage<A, B>(res: PageResponse<A>, map: (a: A) => B): Page<B> {
  return { items: res.items.map(map), page: res.page, hasNext: res.hasNext };
}

/** 후보 또는 직접 입력을 P06 요청 본문으로 바꾼다. */
export function toPlaceInput(c: {
  name: string;
  address: string | null;
  coords: { latitude: number; longitude: number } | null;
  sourceUrl: string | null;
}): PlaceInput {
  return {
    name: c.name,
    address: c.address,
    latitude: c.coords?.latitude ?? null,
    longitude: c.coords?.longitude ?? null,
    sourceUrl: c.sourceUrl,
  };
}

export const placeApi = {
  // P01
  async regions(): Promise<Region[]> {
    const res = isMockMode()
      ? await mockPlaces.regions()
      : await apiRequest<RegionsResponse>('/regions');
    return res.items;
  },

  // P02
  async searchCandidates(params: CandidateSearchParams): Promise<Page<Candidate>> {
    const res = isMockMode()
      ? await mockPlaces.searchCandidates(params)
      : await apiRequest<CandidateSearchResponse>('/place-candidates', { query: { ...params } });
    return toPage(res, toCandidate);
  },

  // P03
  async recognizeLink(req: RecognitionRequest): Promise<Recognition> {
    const res = isMockMode()
      ? await mockPlaces.recognizeLink(req)
      : await apiRequest<RecognitionResponse>('/place-recognitions', { method: 'POST', body: req });
    return toRecognition(res);
  },

  // P04 (multipart image)
  async recognizeImage(image: { uri: string; mimeType: string; fileName: string }): Promise<Recognition> {
    if (isMockMode()) return toRecognition(await mockPlaces.recognizeImage(image.uri));
    const form = new FormData();
    // React Native의 FormData 파일 형식 { uri, name, type }
    form.append('image', { uri: image.uri, name: image.fileName, type: image.mimeType } as unknown as Blob);
    const res = await apiRequest<RecognitionResponse>('/place-image-recognitions', {
      method: 'POST',
      body: form,
      timeoutMs: 30_000,
    });
    return toRecognition(res);
  },

  // P05
  async list(params: PlaceListParams): Promise<Page<Place>> {
    const res = isMockMode()
      ? await mockPlaces.list(params)
      : await apiRequest<PageResponse<PlaceResponse>>('/places', { query: { ...params } });
    return toPage(res, toPlace);
  },

  // P06
  async create(input: PlaceInput): Promise<Place> {
    const res = isMockMode()
      ? await mockPlaces.create(input)
      : await apiRequest<PlaceResponse>('/places', { method: 'POST', body: input });
    return toPlace(res);
  },

  // P07
  async get(id: PlaceId): Promise<Place> {
    const res = isMockMode() ? await mockPlaces.get(id) : await apiRequest<PlaceResponse>(`/places/${id}`);
    return toPlace(res);
  },

  // P08
  async update(id: PlaceId, input: Partial<PlaceInput>): Promise<Place> {
    const res = isMockMode()
      ? await mockPlaces.update(id, input)
      : await apiRequest<PlaceResponse>(`/places/${id}`, { method: 'PATCH', body: input });
    return toPlace(res);
  },

  // P09
  async remove(id: PlaceId): Promise<void> {
    if (isMockMode()) return mockPlaces.remove(id);
    await apiRequest<void>(`/places/${id}`, { method: 'DELETE' });
  },
};
