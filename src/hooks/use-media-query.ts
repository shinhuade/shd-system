'use client';

import { useEffect, useState } from 'react';

/** 手機版斷點：與 antd 的 md 斷點一致（768px 以下視為手機） */
export const MOBILE_BREAKPOINT = 768;

/** 平板以下（含手機）的斷點，用於側邊欄收合等大版面切換 */
export const TABLET_BREAKPOINT = 992;

/**
 * 監聽 media query。
 * SSR 期間一律回傳 false，並在掛載後才同步真實值，避免 hydration 不一致。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const sync = () => setMatches(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener('change', sync);

    return () => {
      mediaQuery.removeEventListener('change', sync);
    };
  }, [query]);

  return matches;
}

/** 是否為手機尺寸（≤ 768px） */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
}
