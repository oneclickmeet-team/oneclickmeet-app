// 코스 추천용 카테고리 코드 7개 (팀 정리본, AI 레포 v3/categories.py와 같은 코드)
export const CATEGORY_CODES = ['MEAL', 'CAFE', 'BAR', 'ACTIVITY', 'CULTURE', 'WALK', 'SHOPPING'] as const;

export type CategoryCode = (typeof CATEGORY_CODES)[number];

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  MEAL: '맛집',
  CAFE: '카페·디저트',
  BAR: '술집·바',
  ACTIVITY: '액티비티·체험',
  CULTURE: '전시·문화',
  WALK: '자연·산책',
  SHOPPING: '쇼핑',
};

/** 장소 수별 기본 방문 순서 */
export const DEFAULT_SEQUENCE: Record<number, CategoryCode[]> = {
  3: ['MEAL', 'CAFE', 'WALK'],
  4: ['MEAL', 'CAFE', 'ACTIVITY', 'BAR'],
  5: ['MEAL', 'CAFE', 'CULTURE', 'WALK', 'BAR'],
};
