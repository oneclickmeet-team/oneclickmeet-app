// P01~P09 mock. 후보 장소는 데모 지역 6곳 주변의 가상 장소다(실제 가게 아님).
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
  RegionId,
  RegionsResponse,
} from '@/types/api';

import { badRequest, delay, fail, nowIso, requireMemberId } from './core';
import { db, saveDb, type MockPlace } from './db';

const REGIONS: (Region & { latitude: number; longitude: number })[] = [
  { regionId: 'HANSUNG', name: '한성대입구역', latitude: 37.5884, longitude: 127.006 },
  { regionId: 'SUNGSHIN', name: '성신여대역', latitude: 37.5926, longitude: 127.0164 },
  { regionId: 'HYEHWA', name: '혜화', latitude: 37.5822, longitude: 127.0019 },
  { regionId: 'SEOCHON', name: '서촌', latitude: 37.5797, longitude: 126.9705 },
  { regionId: 'YEONNAM', name: '연남', latitude: 37.5627, longitude: 126.9255 },
  { regionId: 'JAMSIL', name: '잠실', latitude: 37.5133, longitude: 127.1001 },
];

// [이름 뒤에 붙일 말, 카테고리, 위도 오프셋, 경도 오프셋] (오프셋 0.001 ≈ 100m)
const TEMPLATES: [string, string, number, number][] = [
  ['소금빵 카페', '카페', 0.0012, 0.0008],
  ['루프탑 카페', '카페', -0.0015, 0.0021],
  ['파스타 식당', '음식점', 0.0021, -0.0011],
  ['돈카츠', '음식점', -0.0008, -0.0019],
  ['수제버거', '음식점', 0.0031, 0.0015],
  ['와인바', '술집', -0.0024, 0.0006],
  ['소품샵', '쇼핑', 0.0006, 0.0032],
  ['보드게임 카페', '놀거리', -0.0033, -0.0007],
  ['작은 전시관', '문화', 0.0017, -0.0028],
  ['산책길', '산책', -0.0011, 0.0037],
];

const CATALOG: (PlaceCandidate & { regionId: RegionId })[] = REGIONS.flatMap((r) =>
  TEMPLATES.map(([suffix, category, dLat, dLng], i) => ({
    regionId: r.regionId,
    name: `${r.name} ${suffix}`,
    address: `서울 (가상 주소) ${r.name} ${i + 1}번지`,
    latitude: Number((r.latitude + dLat).toFixed(6)),
    longitude: Number((r.longitude + dLng).toFixed(6)),
    sourceUrl: null,
    categoryLabel: category,
    openingHours: i % 3 === 0 ? null : '11:00~21:00',
  })),
);

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function paginate<T>(all: T[], page = 0, size = 20): PageResponse<T> {
  const start = page * size;
  return { items: all.slice(start, start + size), page, size, hasNext: start + size < all.length };
}

function stripRegion<T extends { regionId: RegionId }>({ regionId: _r, ...rest }: T) {
  return rest;
}

function searchCatalog(query: string): PlaceCandidate[] {
  const q = query.replace(/\s+/g, '');
  if (!q) return [];
  return CATALOG.filter((c) =>
    [c.name, c.address ?? '', c.categoryLabel ?? ''].some((v) => v.replace(/\s+/g, '').includes(q)),
  ).map(stripRegion);
}

function validatePlaceInput(input: PlaceInput) {
  if (!input.name || input.name.trim().length === 0 || input.name.length > 255) {
    badRequest('name', '장소명은 1~255자로 입력해 주세요.');
  }
  if (input.address && input.address.length > 500) badRequest('address', '주소가 너무 길어요.');
  if ((input.latitude === null) !== (input.longitude === null)) {
    badRequest('latitude', '위도와 경도는 함께 입력해야 해요.');
  }
}

function toResponse({ ownerId: _o, ...rest }: MockPlace): PlaceResponse {
  return rest;
}

function findOwned(placeId: number) {
  const me = requireMemberId();
  const place = db().places.find((p) => p.placeId === placeId && p.ownerId === me);
  if (!place) {
    fail({ status: 404, title: 'Not Found', code: 'COMMON-0404', reason: 'RESOURCE_NOT_FOUND' });
  }
  return place;
}

export const mockPlaces = {
  // P01
  async regions(): Promise<RegionsResponse> {
    await delay(150);
    return { items: REGIONS.map(({ regionId, name }) => ({ regionId, name })) };
  },

  // P02
  async searchCandidates(params: CandidateSearchParams): Promise<CandidateSearchResponse> {
    await delay();
    const query = params.query?.trim() ?? '';
    const hasCoords = params.latitude !== undefined && params.longitude !== undefined;
    if (!query && !hasCoords && !params.regionId) {
      badRequest('query', '검색어나 좌표가 필요해요.');
    }
    let results = CATALOG.filter((c) => !params.regionId || c.regionId === params.regionId);
    if (hasCoords) {
      const radius = params.radiusMeters ?? 1000;
      results = results.filter(
        (c) => distanceMeters(params.latitude!, params.longitude!, c.latitude!, c.longitude!) <= radius,
      );
    }
    let items: PlaceCandidate[] = results.map(stripRegion);
    if (query) {
      const matched = new Set(searchCatalog(query).map((c) => c.name));
      items = items.filter((c) => matched.has(c.name));
    }
    return paginate(items, params.page, params.size ?? 15);
  },

  // P03
  async recognizeLink(req: RecognitionRequest): Promise<RecognitionResponse> {
    await delay(700);
    if (!req.sourceUrl && !req.sharedText) badRequest('sourceUrl', '링크나 텍스트가 필요해요.');
    const lines = (req.sharedText ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    // 네이버지도 공유 텍스트면 두 번째 줄이 장소명
    const query = lines[0] === '[네이버지도]' ? lines[1] ?? null : null;
    const candidates = query ? searchCatalog(query) : [];
    if (candidates.length > 0) {
      return {
        status: 'CANDIDATES_FOUND',
        extractedQuery: query,
        candidates,
        sourceUrl: req.sourceUrl ?? null,
        message: null,
      };
    }
    return {
      status: 'NEEDS_SEARCH',
      extractedQuery: query,
      candidates: [],
      sourceUrl: req.sourceUrl ?? null,
      message: query
        ? '장소를 직접 검색해 확인해 주세요.'
        : 'mock 서버는 링크만으로는 장소를 찾지 못해요. 실제 서버에서는 AI가 인식해요.',
    };
  },

  // P04: mock은 이미지를 보지 않고 한성대입구역 후보 3개를 돌려준다.
  async recognizeImage(_uri: string): Promise<RecognitionResponse> {
    await delay(1000);
    return {
      status: 'CANDIDATES_FOUND',
      extractedQuery: '한성대입구역 카페',
      candidates: searchCatalog('한성대입구역').slice(0, 3),
      sourceUrl: null,
      message: null,
    };
  },

  // P05
  async list(params: PlaceListParams): Promise<PageResponse<PlaceResponse>> {
    await delay(300);
    const me = requireMemberId();
    const q = params.query?.replace(/\s+/g, '') ?? '';
    const region = params.regionId ? REGIONS.find((r) => r.regionId === params.regionId) : null;
    const items = db()
      .places.filter((p) => p.ownerId === me)
      .filter(
        (p) => !q || [p.name, p.address ?? ''].some((v) => v.replace(/\s+/g, '').includes(q)),
      )
      .filter(
        (p) =>
          !region ||
          (p.latitude !== null &&
            p.longitude !== null &&
            distanceMeters(region.latitude, region.longitude, p.latitude, p.longitude) <= 1500),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.placeId - a.placeId)
      .map(toResponse);
    return paginate(items, params.page, params.size ?? 20);
  },

  // P06
  async create(input: PlaceInput): Promise<PlaceResponse> {
    await delay();
    validatePlaceInput(input);
    const me = requireMemberId();
    const store = db();
    const now = nowIso();
    const place: MockPlace = {
      placeId: store.nextPlaceId,
      ownerId: me,
      name: input.name.trim(),
      address: input.address?.trim() || null,
      latitude: input.latitude,
      longitude: input.longitude,
      sourceUrl: input.sourceUrl,
      sharedPlaceId: null,
      sourceSharedPlaceId: null,
      createdAt: now,
      updatedAt: now,
    };
    store.nextPlaceId += 1;
    store.places.push(place);
    saveDb();
    return toResponse(place);
  },

  // P07
  async get(placeId: number): Promise<PlaceResponse> {
    await delay(200);
    return toResponse(findOwned(placeId));
  },

  // P08
  async update(placeId: number, input: Partial<PlaceInput>): Promise<PlaceResponse> {
    await delay();
    const place = findOwned(placeId);
    const next = { ...place, ...input, updatedAt: nowIso() };
    validatePlaceInput(next);
    Object.assign(place, next);
    saveDb();
    return toResponse(place);
  },

  // P09
  async remove(placeId: number): Promise<void> {
    await delay();
    const place = findOwned(placeId);
    if (place.sharedPlaceId !== null) {
      fail({ status: 409, title: 'Conflict', code: 'PLACE-0409', reason: 'ACTIVE_SHARE_EXISTS' });
    }
    const store = db();
    store.places = store.places.filter((p) => p.placeId !== placeId);
    saveDb();
  },
};
