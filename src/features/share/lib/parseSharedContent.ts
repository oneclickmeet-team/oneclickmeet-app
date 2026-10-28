import type { ShareIntent } from 'expo-share-intent';

// 공유로 들어온 데이터를 처리 방식별로 나눈다.
// 실기기 확인(2026-10-28):
//  - 네이버지도: text = "[네이버지도]\n장소명\n주소\nhttps://naver.me/..."
//  - 인스타 릴스: webUrl만 옴 (캡션 없음)
//  - 스크린샷: files[0] (앱 cache 폴더, 시스템이 지울 수 있음)
export type SharedContent =
  | { kind: 'naverMap'; name: string; address: string | null; url: string | null }
  | { kind: 'instagram'; url: string }
  | { kind: 'image'; uri: string; mimeType: string; fileName: string }
  | { kind: 'url'; url: string; text: string | null }
  | { kind: 'text'; text: string }
  | { kind: 'unsupported' };

const URL_RE = /https?:\/\/\S+/;

function parseNaverMap(text: string): SharedContent | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines[0] !== '[네이버지도]') return null;
  const url = lines.find((l) => URL_RE.test(l))?.match(URL_RE)?.[0] ?? null;
  const rest = lines.slice(1).filter((l) => !URL_RE.test(l));
  if (rest.length === 0) return null;
  return { kind: 'naverMap', name: rest[0], address: rest[1] ?? null, url };
}

export function parseSharedContent(intent: ShareIntent): SharedContent {
  const image = intent.files?.find((f) => f.mimeType?.startsWith('image/'));
  if (image) {
    return { kind: 'image', uri: image.path, mimeType: image.mimeType, fileName: image.fileName };
  }

  const text = intent.text?.trim() ?? '';
  if (text) {
    const naver = parseNaverMap(text);
    if (naver) return naver;
  }

  const url = intent.webUrl ?? text.match(URL_RE)?.[0] ?? null;
  if (url) {
    if (/instagram\.com\//.test(url)) return { kind: 'instagram', url };
    return { kind: 'url', url, text: text && text !== url ? text : null };
  }

  if (text) return { kind: 'text', text };
  return { kind: 'unsupported' };
}
