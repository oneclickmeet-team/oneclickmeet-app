// 도보 시간 추정. AI 레포(placeflow/v3/walking.py)와 같은 공식이다.
// 직선거리 × 우회계수 1.3 ÷ 4.5km/h, 올림. 실제 경로가 아닌 추정값이다.
import type { Coords } from '@/types/model';

export const WALK_KMH = 4.5;
export const DETOUR = 1.3;
export const MAX_LEG_MIN = 10;
export const ANCHOR_RADIUS_M = 1000;

export function distanceMeters(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function walkMinutes(a: Coords, b: Coords): number {
  const km = (distanceMeters(a, b) / 1000) * DETOUR;
  return Math.max(1, Math.ceil((km / WALK_KMH) * 60));
}
