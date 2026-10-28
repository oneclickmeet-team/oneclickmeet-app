// 임시 테마. Figma 확정 색·폰트로 이 파일만 바꾸면 전체에 반영된다.
export const colors = {
  primary: '#C93553',
  primaryPressed: '#A82B45',
  primarySoft: '#FBE9ED',
  background: '#F7F7F8',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSub: '#6B6B70',
  border: '#E3E3E6',
  danger: '#D93025',
  dangerSoft: '#FDECEA',
  warning: '#B26A00',
  warningSoft: '#FFF4E0',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const fontSize = {
  caption: 12,
  body: 15,
  title: 18,
  heading: 24,
} as const;
