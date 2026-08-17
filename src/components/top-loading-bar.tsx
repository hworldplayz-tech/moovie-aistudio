'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function startTopLoader() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('top-loader-start'));
  }
}

export function stopTopLoader() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('top-loader-stop'));
  }
}

export default function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUrlRef = useRef<string>('');

  const clearAllTimers = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
  }, []);

  const startLoading = useCallback(() => {
    clearAllTimers();
    setVisible(true);
    setProgress(20);

    let currentProgress = 20;
    progressIntervalRef.current = setInterval(() => {
      // Trickle smoothly towards 92%
      const remaining = 92 - currentProgress;
      const step = Math.max(0.5, remaining * 0.12);
      currentProgress += step;

      if (currentProgress >= 92) {
        currentProgress = 92;
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
      setProgress(Math.round(currentProgress * 10) / 10);
    }, 150);

    // Safety timeout: auto finish if taking more than 12s
    safetyTimeoutRef.current = setTimeout(() => {
      finishLoading();
    }, 12000);
  }, [clearAllTimers]);

  const finishLoading = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    setProgress(100);

    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      resetTimeoutRef.current = setTimeout(() => {
        setProgress(0);
      }, 300);
    }, 250);
  }, []);

  // When pathname or search params change (navigation completes), finish the loader
  useEffect(() => {
    const fullUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    if (currentUrlRef.current && currentUrlRef.current !== fullUrl) {
      finishLoading();
    }
    currentUrlRef.current = fullUrl;
  }, [pathname, searchParams, finishLoading]);

  // Global click interception for links
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Find closest anchor
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');
      const downloadAttr = target.getAttribute('download');

      // Skip non-navigational links
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        targetAttr === '_blank' ||
        downloadAttr !== null
      ) {
        return;
      }

      // Check if same origin / internal navigation
      try {
        const targetUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.origin === currentUrl.origin) {
          // If clicking exactly the same path, query, and hash, do nothing
          if (
            targetUrl.pathname === currentUrl.pathname &&
            targetUrl.search === currentUrl.search &&
            targetUrl.hash === currentUrl.hash
          ) {
            return;
          }
          startLoading();
        }
      } catch {
        if (href.startsWith('/')) {
          startLoading();
        }
      }
    };

    const handleCustomStart = () => startLoading();
    const handleCustomStop = () => finishLoading();

    window.addEventListener('click', handleLinkClick, { capture: true });
    window.addEventListener('popstate', handleCustomStart);
    window.addEventListener('top-loader-start', handleCustomStart);
    window.addEventListener('top-loader-stop', handleCustomStop);

    return () => {
      window.removeEventListener('click', handleLinkClick, { capture: true });
      window.removeEventListener('popstate', handleCustomStart);
      window.removeEventListener('top-loader-start', handleCustomStart);
      window.removeEventListener('top-loader-stop', handleCustomStop);
      clearAllTimers();
    };
  }, [startLoading, finishLoading, clearAllTimers]);

  if (!visible && progress === 0) return null;

  return (
    <div
      id="top-red-loading-line"
      className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        className="h-[3px] bg-gradient-to-r from-red-600 via-red-500 to-rose-500 shadow-[0_0_10px_#ef4444,0_0_5px_#dc2626] transition-all ease-out relative"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '180ms' : '220ms',
        }}
      >
        {/* Glowing leading head of the line */}
        <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-r from-transparent via-white/30 to-white shadow-[0_0_10px_#ffffff]" />
      </div>
    </div>
  );
}
