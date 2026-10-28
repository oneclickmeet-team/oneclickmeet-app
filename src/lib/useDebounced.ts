import { useEffect, useState } from 'react';

// 입력이 멈춘 뒤에만 값을 바꾼다. 글자마다 검색 요청이 나가지 않게 한다.
export function useDebounced<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
